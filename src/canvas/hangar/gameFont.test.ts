import { describe, expect, it } from "vitest";
import type { BitmapFont, FontGlyph } from "../../core";
import { decodePng } from "../../core/testing/png";
import { capitalsMiddle, fitGameText, glyphPicturePng, layoutGameText } from "./gameFont";

const glyph = (ch: string, rest: Partial<FontGlyph>): FontGlyph => ({
  codePoint: ch.codePointAt(0)!,
  x: 0,
  y: 0,
  width: 5,
  height: 8,
  top: 7,
  left: 0,
  spacing: 0.4,
  ...rest,
});

/** A small font like the game's HL2: capitals 8 rows tall, 7 above the baseline. */
const font: BitmapFont = {
  lineHeight: 12,
  baseline: 9,
  glyphs: new Map(
    [
      glyph("A", { x: 0, width: 7 }),
      glyph("S", { x: 8 }),
      glyph("T", { x: 14, width: 7 }),
      glyph("j", { x: 22, width: 2, height: 11, top: 8, left: 1, spacing: -0.5 }),
      glyph(" ", { x: 25, width: 1, height: 0, top: -2, left: 3, spacing: 0 }),
    ].map((g) => [g.codePoint, g])
  ),
  bitmap: { width: 32, height: 16, pixels: new Uint8Array(32 * 16) },
};

describe("layoutGameText", () => {
  it("moves the pen by each glyph's advance, rounded glyph by glyph at the scale", () => {
    const one = layoutGameText(font, "SAT", 1)!;
    expect(one.glyphs.map((g) => g.x)).toEqual([0, 5, 12]);
    expect(one.advance).toBe(5 + 7 + 7);
    // 5.4 × 3 = 16.2 → 16, then 7.4 × 3 = 22.2 → 22: the fractions do not add up.
    const three = layoutGameText(font, "SAT", 3)!;
    expect(three.glyphs.map((g) => g.x)).toEqual([0, 16, 38]);
    expect(three.inkLeft).toBe(0);
    expect(three.inkRight).toBe(38 + 7 * 3);
    // 5.4 × 4 = 21.6 → 22.
    expect(layoutGameText(font, "ST", 4)!.glyphs[1].x).toBe(22);
  });

  it("puts each glyph's top above the baseline and honours the space before it", () => {
    const layout = layoutGameText(font, "Aj", 2)!;
    expect(layout.glyphs[0]).toMatchObject({ x: 0, y: -14 });
    // A advances 7.4 × 2 = 14.8 → 15; j starts one font pixel later.
    expect(layout.glyphs[1]).toMatchObject({ x: 17, y: -16 });
  });

  it("skips empty glyphs but moves on by their advance", () => {
    const layout = layoutGameText(font, "A A", 1)!;
    expect(layout.glyphs).toHaveLength(2);
    expect(layout.glyphs[1].x).toBe(7 + 4);
  });

  it("starts a new line one line height lower", () => {
    const layout = layoutGameText(font, "A\nT", 2)!;
    expect(layout.lineHeight).toBe(24);
    expect(layout.glyphs[1]).toMatchObject({ x: 0, y: 24 - 14 });
  });

  it("adds extra letter spacing in the font's pixels", () => {
    expect(layoutGameText(font, "ST", 2, 1)!.glyphs[1].x).toBe(Math.round(6.4 * 2));
  });

  it("gives nothing when the font lacks a character, so the editor's font can stand in", () => {
    expect(layoutGameText(font, "SAY", 1)).toBeUndefined();
    expect(fitGameText(font, "SAY", 2)).toBeUndefined();
  });

  it("shrinks the scale until the text fits, but not below 1", () => {
    expect(fitGameText(font, "SAT", 3, 1000)!.scale).toBe(3);
    expect(fitGameText(font, "SAT", 3, 40)!.scale).toBe(2);
    expect(fitGameText(font, "SAT", 3, 5)!.scale).toBe(1);
  });

  it("finds the middle of the capitals from the A", () => {
    expect(capitalsMiddle(font, 2)).toBe((7 - 4) * 2);
  });
});

describe("glyphPicturePng", () => {
  it("draws the set pixels in the colour and leaves the rest clear", () => {
    const png = glyphPicturePng(
      { width: 2, height: 2, pixels: new Uint8Array([255, 0, 0, 255]) },
      "#193133"
    );
    const image = decodePng(png);
    expect(image.width).toBe(2);
    expect(image.height).toBe(2);
    expect([...image.data]).toEqual([
      0x19, 0x31, 0x33, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0x19, 0x31, 0x33, 255,
    ]);
  });
});
