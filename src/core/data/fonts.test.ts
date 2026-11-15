import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ShipFormatError } from "../errors";
import { GAME_ROOT, HAS_GAME_DATA } from "../testing/gameData";
import { buildFont, type TestGlyph } from "../testing/fontFile";
import { fontPath, glyphAdvance, readBitmapFont } from "./fonts";

const A: TestGlyph = {
  codePoint: 65,
  x: 1,
  y: 0,
  width: 3,
  height: 2,
  top: 2,
  left: 0,
  spacing: 1,
};
const J: TestGlyph = {
  codePoint: 106,
  x: 0,
  y: 1,
  width: 1,
  height: 3,
  top: 2,
  left: 1,
  spacing: -0.5,
};
// 4 × 4: "A" is the top-right 3 × 2 block, "j" the left column below the first row.
const PIXELS = [0, 255, 255, 255, 255, 255, 0, 255, 255, 0, 0, 0, 255, 0, 0, 0];

describe("readBitmapFont", () => {
  it("reads the header, the glyph table and the bitmap", () => {
    const font = readBitmapFont(buildFont([A, J], { width: 4, height: 4, pixels: PIXELS }));
    expect(font.lineHeight).toBe(12);
    expect(font.baseline).toBe(9);
    expect(font.glyphs.size).toBe(2);
    expect(font.glyphs.get(65)).toEqual(A);
    expect(font.glyphs.get(106)).toEqual(J);
    expect(font.bitmap.width).toBe(4);
    expect(font.bitmap.height).toBe(4);
    expect([...font.bitmap.pixels]).toEqual(PIXELS);
  });

  it("has no glyph for a character the file lacks", () => {
    const font = readBitmapFont(buildFont([A], { width: 4, height: 4, pixels: PIXELS }));
    expect(font.glyphs.get(66)).toBeUndefined();
  });

  it("moves the pen by the space before, the width and the space after", () => {
    expect(glyphAdvance(A)).toBe(4);
    expect(glyphAdvance(J)).toBe(1.5);
  });

  it("keeps the first of two records for the same character", () => {
    const font = readBitmapFont(
      buildFont([A, { ...A, x: 0 }], { width: 4, height: 4, pixels: PIXELS })
    );
    expect(font.glyphs.get(65)?.x).toBe(1);
  });

  it("rejects bytes that are not a font", () => {
    const good = buildFont([A], { width: 4, height: 4, pixels: PIXELS });
    expect(() => readBitmapFont(new Uint8Array(10))).toThrow(ShipFormatError);
    const wrongVersion = good.slice();
    wrongVersion[4] = 2;
    expect(() => readBitmapFont(wrongVersion)).toThrow(/version/);
    expect(() => readBitmapFont(good.slice(0, good.length - 1))).toThrow(/cut short/);
    const noTexture = good.slice();
    noTexture[64] = 0;
    expect(() => readBitmapFont(noTexture)).toThrow(/TEX/);
  });

  it("names the file of a font", () => {
    expect(fontPath("HL2")).toBe("fonts/HL2.font");
  });
});

describe.skipIf(!HAS_GAME_DATA)("the game's fonts", () => {
  const dir = join(GAME_ROOT, "fonts");
  const names = HAS_GAME_DATA
    ? readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".font"))
    : [];

  it("finds the fonts", () => {
    expect(names.length).toBeGreaterThanOrEqual(9);
  });

  it.each(names)("reads %s", (name) => {
    const font = readBitmapFont(new Uint8Array(readFileSync(join(dir, name))));
    expect(font.lineHeight).toBeGreaterThan(0);
    expect(font.baseline).toBeGreaterThan(0);
    expect(font.baseline).toBeLessThanOrEqual(font.lineHeight + 1);
    for (const glyph of font.glyphs.values()) {
      expect(glyph.x + glyph.width).toBeLessThanOrEqual(font.bitmap.width);
      expect(glyph.y + glyph.height).toBeLessThanOrEqual(font.bitmap.height);
    }
    const required = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (const ch of required) expect(font.glyphs.has(ch.codePointAt(0)!), ch).toBe(true);
    // A letter has set pixels in its rectangle.
    const a = font.glyphs.get(65)!;
    let set = 0;
    for (let y = a.y; y < a.y + a.height; y++)
      for (let x = a.x; x < a.x + a.width; x++)
        if (font.bitmap.pixels[y * font.bitmap.width + x]) set++;
    expect(set).toBeGreaterThan(0);
  });
});
