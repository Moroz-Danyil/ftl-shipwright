/**
 * Reader and writer for the layout `.txt` (anchor, ellipse, rooms, doors).
 */
import type { Door, LayoutKeyword, Room, ShipLayout } from "./model";
import { resolveWriteOptions, type WriteOptions } from "./options";

const KEYWORD_ARITY: Record<string, number> = {
  X_OFFSET: 1,
  Y_OFFSET: 1,
  HORIZONTAL: 1,
  VERTICAL: 1,
  ELLIPSE: 4,
  ROOM: 5,
  DOOR: 5,
};

const NUMBER_TOKEN = /^[+-]?(\d+\.?\d*|\.\d+)$/;

function isKnownKeyword(token: string): boolean {
  return Object.prototype.hasOwnProperty.call(KEYWORD_ARITY, token);
}

/**
 * Parses a layout `.txt`. Tokens may be separated by any whitespace. Never
 * throws, so modded ships always load:
 *
 * - An unknown keyword is kept in `extraKeywords` with every token after it
 *   up to the next known keyword. A known keyword whose values are missing or
 *   not numbers is kept the same way. An unknown keyword that follows another
 *   kept entry is merged into it (that is how it reads back once written).
 * - A keyword that appears several times (other than ROOM/DOOR): the last wins.
 * - No `ELLIPSE`: the ellipse is all zeros.
 * - Airlocks written `-1, room` are stored as `room, -1`.
 */
export function parseLayoutTxt(text: string): ShipLayout {
  const tokens = text.split(/\s+/).filter((t) => t.length > 0);
  const layout: ShipLayout = {
    ellipse: { halfWidth: 0, halfHeight: 0, offsetX: 0, offsetY: 0 },
    rooms: [],
    doors: [],
  };
  const extra: LayoutKeyword[] = [];
  let i = 0;
  while (i < tokens.length) {
    const keyword = tokens[i];
    if (isKnownKeyword(keyword)) {
      const arity = KEYWORD_ARITY[keyword];
      const raw = tokens.slice(i + 1, i + 1 + arity);
      if (raw.length === arity && raw.every((t) => NUMBER_TOKEN.test(t))) {
        applyKeyword(layout, keyword, raw.map(Number));
        i += arity + 1;
        continue;
      }
    }
    // Unknown keyword, or a known one with bad values: keep the tokens as they are.
    let j = i + 1;
    while (j < tokens.length && !isKnownKeyword(tokens[j])) j++;
    const entry: LayoutKeyword = { keyword, values: tokens.slice(i + 1, j) };
    const previous = extra[extra.length - 1];
    if (previous && !isKnownKeyword(keyword)) previous.values.push(entry.keyword, ...entry.values);
    else extra.push(entry);
    i = j;
  }
  if (extra.length > 0) layout.extraKeywords = extra;
  // Keep a stable property order regardless of the keyword order in the file.
  return normalizeLayoutOrder(layout);
}

function applyKeyword(layout: ShipLayout, keyword: string, values: number[]): void {
  switch (keyword) {
    case "X_OFFSET":
      layout.xOffset = values[0];
      break;
    case "Y_OFFSET":
      layout.yOffset = values[0];
      break;
    case "HORIZONTAL":
      layout.horizontal = values[0];
      break;
    case "VERTICAL":
      layout.vertical = values[0];
      break;
    case "ELLIPSE":
      layout.ellipse = {
        halfWidth: values[0],
        halfHeight: values[1],
        offsetX: values[2],
        offsetY: values[3],
      };
      break;
    case "ROOM": {
      const room: Room = { id: values[0], x: values[1], y: values[2], w: values[3], h: values[4] };
      layout.rooms.push(room);
      break;
    }
    case "DOOR": {
      let roomA = values[2];
      let roomB = values[3];
      if (roomA === -1 && roomB !== -1) {
        roomA = values[3];
        roomB = -1;
      }
      const door: Door = { x: values[0], y: values[1], roomA, roomB, vertical: values[4] !== 0 };
      layout.doors.push(door);
      break;
    }
  }
}

function normalizeLayoutOrder(l: ShipLayout): ShipLayout {
  const out: ShipLayout = {} as ShipLayout;
  if (l.xOffset !== undefined) out.xOffset = l.xOffset;
  if (l.yOffset !== undefined) out.yOffset = l.yOffset;
  if (l.horizontal !== undefined) out.horizontal = l.horizontal;
  if (l.vertical !== undefined) out.vertical = l.vertical;
  out.ellipse = l.ellipse;
  out.rooms = l.rooms;
  out.doors = l.doors;
  if (l.extraKeywords !== undefined) out.extraKeywords = l.extraKeywords;
  return out;
}

/**
 * Writes a layout `.txt` in the vanilla style: one token per line, keywords in
 * the order `X_OFFSET Y_OFFSET VERTICAL HORIZONTAL ELLIPSE ROOM... DOOR...`,
 * absent optional keywords skipped, then the kept unknown keywords. Airlocks
 * are written `room, -1`.
 */
export function writeLayoutTxt(layout: ShipLayout, options?: WriteOptions): string {
  const { lineEnding } = resolveWriteOptions(options);
  const out: Array<string | number> = [];
  if (layout.xOffset !== undefined) out.push("X_OFFSET", layout.xOffset);
  if (layout.yOffset !== undefined) out.push("Y_OFFSET", layout.yOffset);
  if (layout.vertical !== undefined) out.push("VERTICAL", layout.vertical);
  if (layout.horizontal !== undefined) out.push("HORIZONTAL", layout.horizontal);
  const e = layout.ellipse;
  out.push("ELLIPSE", e.halfWidth, e.halfHeight, e.offsetX, e.offsetY);
  for (const r of layout.rooms) out.push("ROOM", r.id, r.x, r.y, r.w, r.h);
  for (const d of layout.doors) {
    let a = d.roomA;
    let b = d.roomB;
    if (a === -1 && b !== -1) {
      a = d.roomB;
      b = -1;
    }
    out.push("DOOR", d.x, d.y, a, b, d.vertical ? 1 : 0);
  }
  for (const k of layout.extraKeywords ?? []) out.push(k.keyword, ...k.values);
  return out.map(String).join(lineEnding) + lineEnding;
}
