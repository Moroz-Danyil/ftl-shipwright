/** Game font files (`fonts/*.font`) made by hand, for the tests. */

export interface TestGlyph {
  codePoint: number;
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  spacing: number;
}

/** Builds a `.font` file the way the game's files are laid out. */
export function buildFont(
  glyphs: TestGlyph[],
  bitmap: { width: number; height: number; pixels: number[] },
  head = { lineHeight: 12, baseline: 9 }
): Uint8Array {
  const tableAt = 24;
  const textureAt = Math.ceil((tableAt + glyphs.length * 16) / 64) * 64;
  const textureSize = 32 + bitmap.width * bitmap.height;
  const bytes = new Uint8Array(textureAt + textureSize);
  const view = new DataView(bytes.buffer);
  bytes.set([0x46, 0x4f, 0x4e, 0x54, 1, head.lineHeight, head.baseline, 0]);
  view.setUint32(8, tableAt);
  view.setUint16(12, glyphs.length);
  view.setUint16(14, 16);
  view.setUint32(16, textureAt);
  view.setUint32(20, textureSize);
  glyphs.forEach((g, i) => {
    const at = tableAt + i * 16;
    view.setUint32(at, g.codePoint);
    view.setUint16(at + 4, g.x);
    view.setUint16(at + 6, g.y);
    bytes[at + 8] = g.width;
    bytes[at + 9] = g.height;
    view.setInt16(at + 10, Math.round(g.top * 256));
    view.setInt16(at + 12, Math.round(g.left * 256));
    view.setInt16(at + 14, Math.round(g.spacing * 256));
  });
  bytes.set([0x54, 0x45, 0x58, 0x0a, 0x02, 0x40, 0, 0], textureAt);
  view.setUint16(textureAt + 8, bitmap.width);
  view.setUint16(textureAt + 10, bitmap.height);
  view.setUint16(textureAt + 12, 1);
  view.setUint32(textureAt + 16, 32);
  view.setUint32(textureAt + 20, bitmap.width * bitmap.height);
  bytes.set(bitmap.pixels, textureAt + 32);
  return bytes;
}
