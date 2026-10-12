import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { alphaAt, decodePng, opaqueBounds, readPngSize } from "./png";

/** Builds a PNG from already-filtered scanlines (CRCs are not checked by the reader, so they are zero). */
function makePng(
  width: number,
  height: number,
  colorType: number,
  filtered: number[],
  extra: Array<[string, number[]]> = []
): Uint8Array {
  const chunk = (type: string, body: Uint8Array) => {
    const out = new Uint8Array(12 + body.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, body.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(body, 8);
    return out;
  };
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    ...extra.map(([t, b]) => chunk(t, new Uint8Array(b))),
    chunk("IDAT", new Uint8Array(deflateSync(new Uint8Array(filtered)))),
    chunk("IEND", new Uint8Array(0)),
  ];
  return new Uint8Array(Buffer.concat(parts));
}

describe("png reader", () => {
  it("reads the size", () => {
    expect(
      readPngSize(makePng(3, 2, 6, [0, ...new Array(12).fill(0), 0, ...new Array(12).fill(0)]))
    ).toEqual({ width: 3, height: 2 });
    expect(() => readPngSize(new Uint8Array([1, 2, 3]))).toThrow();
  });

  it("decodes RGBA with all five filters", () => {
    // 2×5 RGBA image; each row uses a different filter. Expected pixels:
    const rows = [
      [10, 20, 30, 0, 40, 50, 60, 255],
      [11, 21, 31, 1, 41, 51, 61, 254],
      [12, 22, 32, 2, 42, 52, 62, 253],
      [13, 23, 33, 3, 43, 53, 63, 252],
      [14, 24, 34, 4, 44, 54, 64, 251],
    ];
    const bpp = 4;
    const filtered: number[] = [];
    rows.forEach((row, y) => {
      const prev = y > 0 ? rows[y - 1] : new Array(row.length).fill(0);
      const filter = y; // 0 none, 1 sub, 2 up, 3 average, 4 paeth
      filtered.push(filter);
      row.forEach((value, x) => {
        const a = x >= bpp ? row[x - bpp] : 0;
        const b = prev[x];
        const c = x >= bpp ? prev[x - bpp] : 0;
        let pred = 0;
        if (filter === 1) pred = a;
        if (filter === 2) pred = b;
        if (filter === 3) pred = (a + b) >> 1;
        if (filter === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        filtered.push((value - pred + 256) & 0xff);
      });
    });
    const img = decodePng(makePng(2, 5, 6, filtered));
    expect([...img.data]).toEqual(rows.flat());
    expect(alphaAt(img, 0, 0)).toBe(0);
    expect(alphaAt(img, 1, 0)).toBe(255);
    expect(alphaAt(img, 5, 5)).toBe(0);
    expect(opaqueBounds(img)).toEqual({ x: 0, y: 0, w: 2, h: 5 });
  });

  it("decodes palette images with transparency", () => {
    const img = decodePng(
      makePng(
        3,
        1,
        3,
        [0, 0, 1, 0],
        [
          ["PLTE", [255, 0, 0, 0, 255, 0]],
          ["tRNS", [0]],
        ]
      )
    );
    expect([...img.data]).toEqual([255, 0, 0, 0, 0, 255, 0, 255, 255, 0, 0, 0]);
    expect(opaqueBounds(img)).toEqual({ x: 1, y: 0, w: 1, h: 1 });
  });

  it("returns undefined bounds for a fully transparent picture", () => {
    expect(opaqueBounds(decodePng(makePng(1, 1, 4, [0, 9, 0])))).toBeUndefined();
  });
});
