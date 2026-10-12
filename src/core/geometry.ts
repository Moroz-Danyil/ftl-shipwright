/**
 * Geometry helpers. All pure functions.
 *
 * Coordinate systems:
 * - **cells**: the grid of the layout `.txt` (rooms, doors), 35 px per cell;
 * - **ship pixels**: the game's pixel space for the ship, where a room at
 *   cell `(x, y)` is drawn at `((xOffset + x) * 35, (yOffset + y) * 35)`;
 * - **hull pixels**: relative to the hull picture's top-left corner (mounts,
 *   gibs and the floor/cloak offsets use these).
 */
import type { Door, Gib, Mount, Point, Rect, Room, ShipLayout, ShipLayoutXml } from "./model";

/** Size of one grid cell in pixels. */
export const CELL_SIZE = 35;

/** A wall segment in ship pixels, from `(x1, y1)` to `(x2, y2)`. */
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The anchor (`X_OFFSET`/`Y_OFFSET`) in cells; missing values are 0. */
export function anchorCells(layout: Pick<ShipLayout, "xOffset" | "yOffset">): Point {
  return { x: layout.xOffset ?? 0, y: layout.yOffset ?? 0 };
}

/** The anchor in ship pixels. */
export function anchorPx(layout: Pick<ShipLayout, "xOffset" | "yOffset">): Point {
  const a = anchorCells(layout);
  return { x: a.x * CELL_SIZE, y: a.y * CELL_SIZE };
}

/** Top-left ship pixel of the cell `(cx, cy)`. */
export function cellToPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  cx: number,
  cy: number
): Point {
  const a = anchorCells(layout);
  return { x: (a.x + cx) * CELL_SIZE, y: (a.y + cy) * CELL_SIZE };
}

/** The cell containing the ship pixel `(px, py)` (may be negative or outside every room). */
export function pxToCell(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  px: number,
  py: number
): Point {
  const a = anchorCells(layout);
  return { x: Math.floor(px / CELL_SIZE) - a.x, y: Math.floor(py / CELL_SIZE) - a.y };
}

/** A room's rectangle in ship pixels. */
export function roomRectPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  room: Pick<Room, "x" | "y" | "w" | "h">
): Rect {
  const p = cellToPx(layout, room.x, room.y);
  return { x: p.x, y: p.y, w: room.w * CELL_SIZE, h: room.h * CELL_SIZE };
}

/** True if the cell `(cx, cy)` lies inside the room. */
export function roomContainsCell(
  room: Pick<Room, "x" | "y" | "w" | "h">,
  cx: number,
  cy: number
): boolean {
  return cx >= room.x && cx < room.x + room.w && cy >= room.y && cy < room.y + room.h;
}

/** The room covering the cell `(cx, cy)`, or `undefined` (space). If rooms overlap, the first one wins. */
export function roomAtCell(
  layout: Pick<ShipLayout, "rooms">,
  cx: number,
  cy: number
): Room | undefined {
  return layout.rooms.find((r) => roomContainsCell(r, cx, cy));
}

/** Bounding box of all rooms in cells, or `undefined` when there are no rooms. */
export function roomsBoundsCells(layout: Pick<ShipLayout, "rooms">): Rect | undefined {
  if (layout.rooms.length === 0) return undefined;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of layout.rooms) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Bounding box of all rooms in ship pixels, or `undefined` when there are no rooms. */
export function roomsBoundsPx(
  layout: Pick<ShipLayout, "rooms" | "xOffset" | "yOffset">
): Rect | undefined {
  const b = roomsBoundsCells(layout);
  return b && roomRectPx(layout, b);
}

/**
 * The shield ellipse in ship pixels: centred on the rooms' bounding box
 * centre plus the ellipse offset. `undefined` when there are no rooms.
 */
export function shieldEllipsePx(
  layout: ShipLayout
): { cx: number; cy: number; rx: number; ry: number } | undefined {
  const b = roomsBoundsPx(layout);
  if (!b) return undefined;
  const e = layout.ellipse;
  return {
    cx: b.x + b.w / 2 + e.offsetX,
    cy: b.y + b.h / 2 + e.offsetY,
    rx: e.halfWidth,
    ry: e.halfHeight,
  };
}

// ---------------------------------------------------------------------------
// Pictures

/** The hull picture's rectangle in ship pixels: anchor + `<img x y>`, size `<img w h>`. */
export function hullRectPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  xml: Pick<ShipLayoutXml, "img">
): Rect {
  const a = anchorPx(layout);
  return { x: a.x + xml.img.x, y: a.y + xml.img.y, w: xml.img.w, h: xml.img.h };
}

/** Converts hull pixels to ship pixels. */
export function hullToShipPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  xml: Pick<ShipLayoutXml, "img">,
  p: Point
): Point {
  const h = hullRectPx(layout, xml);
  return { x: h.x + p.x, y: h.y + p.y };
}

/** Converts ship pixels to hull pixels. */
export function shipToHullPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  xml: Pick<ShipLayoutXml, "img">,
  p: Point
): Point {
  const h = hullRectPx(layout, xml);
  return { x: p.x - h.x, y: p.y - h.y };
}

/** Top-left ship pixel of the floor picture (hull corner + floor offset; a missing offset counts as 0, 0). */
export function floorPositionPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  xml: Pick<ShipLayoutXml, "img" | "floorOffset">
): Point {
  return hullToShipPx(layout, xml, xml.floorOffset ?? { x: 0, y: 0 });
}

/** Top-left ship pixel of the cloak picture (hull corner + cloak offset; a missing offset counts as 0, 0). */
export function cloakPositionPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  xml: Pick<ShipLayoutXml, "img" | "cloakOffset">
): Point {
  return hullToShipPx(layout, xml, xml.cloakOffset ?? { x: 0, y: 0 });
}

/** A weapon mount's position in ship pixels. */
export function mountPositionPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  xml: Pick<ShipLayoutXml, "img">,
  mount: Pick<Mount, "x" | "y">
): Point {
  return hullToShipPx(layout, xml, mount);
}

/** A gib picture's top-left corner in ship pixels. */
export function gibPositionPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  xml: Pick<ShipLayoutXml, "img">,
  gib: Pick<Gib, "x" | "y">
): Point {
  return hullToShipPx(layout, xml, gib);
}

// ---------------------------------------------------------------------------
// Doors

/**
 * The two cells a door separates: for a vertical door the cells left and
 * right of it, for a horizontal door the cells above and below it.
 */
export function doorCells(door: Pick<Door, "x" | "y" | "vertical">): [Point, Point] {
  return door.vertical
    ? [
        { x: door.x - 1, y: door.y },
        { x: door.x, y: door.y },
      ]
    : [
        { x: door.x, y: door.y - 1 },
        { x: door.x, y: door.y },
      ];
}

/** The wall segment a door occupies, in ship pixels (35 px long). */
export function doorSegmentPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  door: Pick<Door, "x" | "y" | "vertical">
): Segment {
  const p = cellToPx(layout, door.x, door.y);
  return door.vertical
    ? { x1: p.x, y1: p.y, x2: p.x, y2: p.y + CELL_SIZE }
    : { x1: p.x, y1: p.y, x2: p.x + CELL_SIZE, y2: p.y };
}

/**
 * The rooms on the two sides of a door, derived from the room geometry:
 * `[left or top, right or bottom]`, `-1` for space.
 */
export function doorSides(
  layout: Pick<ShipLayout, "rooms">,
  door: Pick<Door, "x" | "y" | "vertical">
): [number, number] {
  const [c1, c2] = doorCells(door);
  return [roomAtCell(layout, c1.x, c1.y)?.id ?? -1, roomAtCell(layout, c2.x, c2.y)?.id ?? -1];
}

/**
 * The `roomA, roomB` pair a door should have, from the room geometry:
 * an inner door gives `[left/top, right/bottom]`, an airlock gives
 * `[room, -1]`, a door touching no room gives `[-1, -1]`.
 */
export function doorRooms(
  layout: Pick<ShipLayout, "rooms">,
  door: Pick<Door, "x" | "y" | "vertical">
): [number, number] {
  const [a, b] = doorSides(layout, door);
  if (a === -1) return [b, -1];
  return [a, b];
}

/**
 * True if the door's written `roomA`/`roomB` match the geometry
 * (inner doors in either order; airlocks as `room, -1`).
 */
export function doorMatchesGeometry(layout: Pick<ShipLayout, "rooms">, door: Door): boolean {
  const [a, b] = doorRooms(layout, door);
  if (b === -1) return door.roomA === a && door.roomB === -1;
  return (door.roomA === a && door.roomB === b) || (door.roomA === b && door.roomB === a);
}

// ---------------------------------------------------------------------------
// Crew stations

/** Station cell index → `(x, y)` inside the room (row by row from the top-left). */
export function stationCellToXY(room: Pick<Room, "w">, number: number): Point {
  return { x: number % room.w, y: Math.floor(number / room.w) };
}

/** `(x, y)` inside the room → station cell index (`y * w + x`). */
export function stationXYToCell(room: Pick<Room, "w">, x: number, y: number): number {
  return y * room.w + x;
}

/** True if the station cell index lies inside the room (`0 <= number < w * h`). */
export function stationInRoom(room: Pick<Room, "w" | "h">, number: number): boolean {
  return Number.isInteger(number) && number >= 0 && number < room.w * room.h;
}

/** Top-left ship pixel of a station cell. */
export function stationCellPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset">,
  room: Room,
  number: number
): Point {
  const c = stationCellToXY(room, number);
  return cellToPx(layout, room.x + c.x, room.y + c.y);
}
