/**
 * A tiny PNG reader for the tests (Node only, uses `zlib`).
 * Supports 8-bit, non-interlaced images of colour types 0, 2, 3, 4 and 6,
 * which covers every vanilla ship picture (they are all 8-bit RGBA).
 */
import { inflateSync } from "node:zlib";

export interface PngImage {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row by row. */
  data: Uint8Array;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function checkSignature(buf: Uint8Array): void {
  if (buf.length < 8 || SIGNATURE.some((b, i) => buf[i] !== b)) throw new Error("Not a PNG file");
}

function u32(buf: Uint8Array, at: number): number {
  return ((buf[at] << 24) >>> 0) + (buf[at + 1] << 16) + (buf[at + 2] << 8) + buf[at + 3];
}

/** Width and height from the IHDR chunk, without decoding the pixels. */
export function readPngSize(buf: Uint8Array): { width: number; height: number } {
  checkSignature(buf);
  return { width: u32(buf, 16), height: u32(buf, 20) };
}

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** Decodes a PNG into RGBA pixels. */
export function decodePng(buf: Uint8Array): PngImage {
  checkSignature(buf);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Uint8Array | undefined;
  let transparency: Uint8Array | undefined;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= buf.length) {
    const length = u32(buf, pos);
    const type = String.fromCharCode(buf[pos + 4], buf[pos + 5], buf[pos + 6], buf[pos + 7]);
    const body = buf.subarray(pos + 8, pos + 8 + length);
    pos += 12 + length;
    if (type === "IHDR") {
      width = u32(body, 0);
      height = u32(body, 4);
      bitDepth = body[8];
      colorType = body[9];
      interlace = body[12];
    } else if (type === "PLTE") palette = body;
    else if (type === "tRNS") transparency = body;
    else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
  }
  if (bitDepth !== 8) throw new Error(`PNG bit depth ${bitDepth} is not supported`);
  if (interlace !== 0) throw new Error("Interlaced PNG is not supported");
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`PNG colour type ${colorType} is not supported`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x];
      const a = x >= channels ? pixels[dst + x - channels] : 0;
      const b = y > 0 ? pixels[dst - stride + x] : 0;
      const c = x >= channels && y > 0 ? pixels[dst - stride + x - channels] : 0;
      let out: number;
      switch (filter) {
        case 0:
          out = v;
          break;
        case 1:
          out = v + a;
          break;
        case 2:
          out = v + b;
          break;
        case 3:
          out = v + ((a + b) >> 1);
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          out = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error(`Bad PNG filter ${filter} in row ${y}`);
      }
      pixels[dst + x] = out & 0xff;
    }
  }

  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels;
    const d = i * 4;
    switch (colorType) {
      case 6:
        data[d] = pixels[s];
        data[d + 1] = pixels[s + 1];
        data[d + 2] = pixels[s + 2];
        data[d + 3] = pixels[s + 3];
        break;
      case 2:
        data[d] = pixels[s];
        data[d + 1] = pixels[s + 1];
        data[d + 2] = pixels[s + 2];
        data[d + 3] = 255;
        break;
      case 0:
        data[d] = data[d + 1] = data[d + 2] = pixels[s];
        data[d + 3] = 255;
        break;
      case 4:
        data[d] = data[d + 1] = data[d + 2] = pixels[s];
        data[d + 3] = pixels[s + 1];
        break;
      case 3: {
        const idx = pixels[s];
        data[d] = palette?.[idx * 3] ?? 0;
        data[d + 1] = palette?.[idx * 3 + 1] ?? 0;
        data[d + 2] = palette?.[idx * 3 + 2] ?? 0;
        data[d + 3] = transparency && idx < transparency.length ? transparency[idx] : 255;
        break;
      }
    }
  }
  return { width, height, data };
}

/** Alpha of the pixel `(x, y)`, or 0 outside the picture. */
export function alphaAt(img: PngImage, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return 0;
  return img.data[(y * img.width + x) * 4 + 3];
}

/** Bounding box of the pixels with alpha above `threshold`, or `undefined` if none. */
export function opaqueBounds(
  img: PngImage,
  threshold = 0
): { x: number; y: number; w: number; h: number } | undefined {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return undefined;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
