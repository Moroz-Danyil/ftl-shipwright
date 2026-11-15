/**
 * The game's bitmap fonts (`fonts/*.font`): a header, a glyph table and the
 * glyphs' bitmap. The layout is described in `docs/game-data.md`; every
 * number is big-endian.
 */
import { ShipFormatError } from "../errors";

/** Where the game keeps a font: `fonts/<name>.font`. */
export function fontPath(name: string): string {
  return `fonts/${name}.font`;
}

/** One character of a font. Distances are in the font's pixels. */
export interface FontGlyph {
  codePoint: number;
  /** The glyph's rectangle in the bitmap. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Rows of the glyph above the baseline (its top edge is this far above it). */
  top: number;
  /** Space before the glyph. */
  left: number;
  /** Space after the glyph; it may be fractional or negative. */
  spacing: number;
}

/** A font's bitmap: one coverage byte per pixel (0 empty, 255 set), row by row from the top. */
export interface FontBitmap {
  width: number;
  height: number;
  pixels: Uint8Array;
}

export interface BitmapFont {
  /** Distance between two lines. */
  lineHeight: number;
  /** Distance from the top of a line to its baseline. */
  baseline: number;
  glyphs: Map<number, FontGlyph>;
  bitmap: FontBitmap;
}

const HEADER_SIZE = 24;
const GLYPH_SIZE = 16;
const TEXTURE_HEADER_SIZE = 32;

/** How far the pen moves after drawing the glyph. */
export function glyphAdvance(glyph: FontGlyph): number {
  return glyph.left + glyph.width + glyph.spacing;
}

function matches(bytes: Uint8Array, at: number, text: string): boolean {
  for (let i = 0; i < text.length; i++) if (bytes[at + i] !== text.charCodeAt(i)) return false;
  return true;
}

/** Reads a `.font` file. Throws {@link ShipFormatError} when the bytes are not one. */
export function readBitmapFont(bytes: Uint8Array): BitmapFont {
  const fail = (why: string): never => {
    throw new ShipFormatError(`Not a game font: ${why}`);
  };
  if (bytes.length < HEADER_SIZE || !matches(bytes, 0, "FONT")) fail("no FONT signature");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[4] !== 1) fail(`unknown version ${bytes[4]}`);
  const lineHeight = bytes[5];
  const baseline = bytes[6];
  const tableAt = view.getUint32(8);
  const count = view.getUint16(12);
  const recordSize = view.getUint16(14);
  const textureAt = view.getUint32(16);
  const textureSize = view.getUint32(20);
  if (recordSize < GLYPH_SIZE) fail(`glyph records of ${recordSize} bytes`);
  if (tableAt + count * recordSize > textureAt) fail("the glyph table runs into the bitmap");
  if (textureAt + textureSize > bytes.length) fail("the bitmap is cut short");

  if (textureSize < TEXTURE_HEADER_SIZE || !matches(bytes, textureAt, "TEX\n"))
    fail("no TEX bitmap");
  const width = view.getUint16(textureAt + 8);
  const height = view.getUint16(textureAt + 10);
  const pixelsAt = view.getUint32(textureAt + 16);
  const pixelsSize = view.getUint32(textureAt + 20);
  if (pixelsSize !== width * height) fail("the bitmap is not one byte per pixel");
  if (pixelsAt + pixelsSize > textureSize) fail("the bitmap's pixels are cut short");
  const pixels = bytes.slice(textureAt + pixelsAt, textureAt + pixelsAt + pixelsSize);

  // Signed 8.8 fixed-point numbers.
  const fixed = (at: number) => view.getInt16(at) / 256;
  const glyphs = new Map<number, FontGlyph>();
  for (let i = 0; i < count; i++) {
    const at = tableAt + i * recordSize;
    const glyph: FontGlyph = {
      codePoint: view.getUint32(at),
      x: view.getUint16(at + 4),
      y: view.getUint16(at + 6),
      width: bytes[at + 8],
      height: bytes[at + 9],
      top: fixed(at + 10),
      left: fixed(at + 12),
      spacing: fixed(at + 14),
    };
    if (!glyphs.has(glyph.codePoint)) glyphs.set(glyph.codePoint, glyph);
  }
  return { lineHeight, baseline, glyphs, bitmap: { width, height, pixels } };
}
