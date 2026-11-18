/**
 * The resize handles of a selected room: one on each edge and each corner.
 * They are drawn as small squares of a fixed screen size at the corners and
 * edge middles, but a whole edge can be grabbed: within a few screen pixels
 * of it, outside the room or a little inside. Inside, the reach shrinks with
 * the room on screen, so the middle of a small room is still free for
 * moving it.
 */
import type { Point, Rect } from "../core";

export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** The side of a drawn handle, in screen pixels. */
export const HANDLE_SIZE = 8;

/** How far from an edge a press still grabs it, in screen pixels. */
export const HANDLE_REACH = 7;

/** The pointer's look over each handle. */
export const HANDLE_CURSORS: Record<Handle, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

/** Where each handle is drawn on a rectangle (ship pixels). */
export function handlePoint(r: Rect, handle: Handle): Point {
  const x = handle.includes("w") ? r.x : handle.includes("e") ? r.x + r.w : r.x + r.w / 2;
  const y = handle.includes("n") ? r.y : handle.includes("s") ? r.y + r.h : r.y + r.h / 2;
  return { x, y };
}

/** The handle of a room (its rectangle in ship pixels) under a ship pixel at this zoom. */
export function handleAt(r: Rect, p: Point, scale: number): Handle | undefined {
  const reach = HANDLE_REACH / scale;
  if (p.x < r.x - reach || p.x > r.x + r.w + reach) return undefined;
  if (p.y < r.y - reach || p.y > r.y + r.h + reach) return undefined;
  // How far a press inside the room still grabs an edge: never more than a quarter of the room.
  const inner = Math.min(reach, Math.min(r.w, r.h) / 4);
  const near = (inside: number) => inside >= -reach && inside <= inner;
  const vertical = near(p.y - r.y) ? "n" : near(r.y + r.h - p.y) ? "s" : "";
  const horizontal = near(p.x - r.x) ? "w" : near(r.x + r.w - p.x) ? "e" : "";
  const handle = vertical + horizontal;
  return handle === "" ? undefined : (handle as Handle);
}

/**
 * A room's rectangle (cells) after its handle was dragged by whole cells.
 * The edges a handle does not hold stay; a room is never smaller than one cell.
 */
export function resizedRect(room: Rect, handle: Handle, dx: number, dy: number): Rect {
  let { x, y, w, h } = room;
  if (handle.includes("w")) {
    x = Math.min(room.x + dx, room.x + room.w - 1);
    w = room.x + room.w - x;
  } else if (handle.includes("e")) w = Math.max(1, room.w + dx);
  if (handle.includes("n")) {
    y = Math.min(room.y + dy, room.y + room.h - 1);
    h = room.y + room.h - y;
  } else if (handle.includes("s")) h = Math.max(1, room.h + dy);
  return { x, y, w, h };
}
