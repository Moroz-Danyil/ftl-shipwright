/**
 * Texts in the game's own bitmap fonts: laying a text out glyph by glyph,
 * and the font's bitmap turned once into a picture of a given colour, so each
 * glyph can be drawn as a piece of it.
 */
import { useEffect, useState } from "react";
import { zlibSync } from "fflate";
import {
  fontPath,
  glyphAdvance,
  readBitmapFont,
  type BitmapFont,
  type FileSource,
  type FontBitmap,
  type FontGlyph,
} from "../../core";
import { pngUrl } from "../pictures";

/** The game's fonts used by the hangar. */
export type GameFontName = "HL1" | "HL2" | "JustinFont8" | "JustinFont10" | "JustinFont12Bold";

/** A glyph placed on screen: its top-left corner, relative to the start of the first baseline. */
export interface PlacedGlyph {
  glyph: FontGlyph;
  x: number;
  y: number;
}

export interface TextLayout {
  glyphs: PlacedGlyph[];
  /** The leftmost and rightmost drawn pixels (the ink). */
  inkLeft: number;
  inkRight: number;
  /** Where the pen stopped on the last line, in screen pixels. */
  advance: number;
  /** The distance between lines, scaled. */
  lineHeight: number;
  scale: number;
}

/**
 * Lays a text out in a font drawn `scale` times its size: each glyph at the
 * pen plus its space before, the pen moving by the glyph's advance (plus
 * `letterSpacing`, in the font's pixels) scaled and rounded to a whole
 * screen pixel, glyph by glyph, as the game does. A line feed starts a new
 * line. `undefined` when the font lacks a character.
 */
export function layoutGameText(
  font: BitmapFont,
  text: string,
  scale: number,
  letterSpacing = 0
): TextLayout | undefined {
  const glyphs: PlacedGlyph[] = [];
  let pen = 0;
  let line = 0;
  let inkLeft = Infinity;
  let inkRight = -Infinity;
  for (const ch of text) {
    if (ch === "\n") {
      pen = 0;
      line++;
      continue;
    }
    const glyph = font.glyphs.get(ch.codePointAt(0)!);
    if (!glyph) return undefined;
    if (glyph.width > 0 && glyph.height > 0) {
      const x = pen + Math.round(glyph.left * scale);
      glyphs.push({ glyph, x, y: Math.round((line * font.lineHeight - glyph.top) * scale) });
      inkLeft = Math.min(inkLeft, x);
      inkRight = Math.max(inkRight, x + glyph.width * scale);
    }
    pen += Math.round((glyphAdvance(glyph) + letterSpacing) * scale);
  }
  if (glyphs.length === 0) inkLeft = inkRight = 0;
  return {
    glyphs,
    inkLeft,
    inkRight,
    advance: pen,
    lineHeight: font.lineHeight * scale,
    scale,
  };
}

/**
 * The largest scale up to `scale` at which the text's ink fits `maxWidth`
 * (at least 1), and its layout; `undefined` when the font lacks a character.
 */
export function fitGameText(
  font: BitmapFont,
  text: string,
  scale: number,
  maxWidth = Infinity,
  letterSpacing = 0
): TextLayout | undefined {
  for (let s = scale; s > 1; s--) {
    const layout = layoutGameText(font, text, s, letterSpacing);
    if (!layout) return undefined;
    if (layout.inkRight - layout.inkLeft <= maxWidth) return layout;
  }
  return layoutGameText(font, text, 1, letterSpacing);
}

/**
 * How far below the middle of the capitals the baseline lies, scaled: from
 * the font's "A". Used to centre a text on a line.
 */
export function capitalsMiddle(font: BitmapFont, scale: number): number {
  const a = font.glyphs.get(65);
  return a ? (a.top - a.height / 2) * scale : (font.baseline / 2) * scale;
}

// PNG writing for the glyph pictures: 8-bit RGBA, no filtering.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** A PNG of the bitmap: every set pixel in the colour (`#rrggbb`), the rest clear. */
export function glyphPicturePng(bitmap: FontBitmap, colour: string): Uint8Array {
  const rgb = [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16));
  const { width, height, pixels } = bitmap;
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    for (let x = 0; x < width; x++) {
      const coverage = pixels[y * width + x];
      if (!coverage) continue;
      const at = row + 1 + x * 4;
      raw[at] = rgb[0];
      raw[at + 1] = rgb[1];
      raw[at + 2] = rgb[2];
      raw[at + 3] = coverage;
    }
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8);
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlibSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const pictureCache = new WeakMap<BitmapFont, Map<string, string>>();

/** The URL of the font's bitmap in a colour, made once per font and colour. */
export function glyphPictureUrl(font: BitmapFont, colour: string): string {
  let byColour = pictureCache.get(font);
  if (!byColour) {
    byColour = new Map();
    pictureCache.set(font, byColour);
  }
  let url = byColour.get(colour);
  if (!url) {
    url = pngUrl(glyphPicturePng(font.bitmap, colour));
    byColour.set(colour, url);
  }
  return url;
}

const fontCache = new WeakMap<FileSource, Map<GameFontName, Promise<BitmapFont | undefined>>>();

/** Reads one of the game's fonts (cached per source); `undefined` when it is missing or unreadable. */
export function loadGameFont(
  source: FileSource,
  name: GameFontName
): Promise<BitmapFont | undefined> {
  let bySource = fontCache.get(source);
  if (!bySource) {
    bySource = new Map();
    fontCache.set(source, bySource);
  }
  let font = bySource.get(name);
  if (!font) {
    font = source.readBytes(fontPath(name)).then(
      (bytes) => {
        try {
          return bytes ? readBitmapFont(bytes) : undefined;
        } catch {
          return undefined;
        }
      },
      () => undefined
    );
    bySource.set(name, font);
  }
  return font;
}

/** The font once it is read; `undefined` while reading, or when the game has none. */
export function useGameFont(
  source: FileSource | undefined,
  name: GameFontName
): BitmapFont | undefined {
  const [loaded, setLoaded] = useState<{
    source: FileSource;
    name: GameFontName;
    font?: BitmapFont;
  }>();
  useEffect(() => {
    if (!source) return;
    let live = true;
    void loadGameFont(source, name).then((font) => {
      if (live) setLoaded({ source, name, font });
    });
    return () => {
      live = false;
    };
  }, [source, name]);
  return loaded && loaded.source === source && loaded.name === name ? loaded.font : undefined;
}
