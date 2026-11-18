/**
 * The ship's place on the game's screen: the view-limit frame (19 × 13
 * cells, `canvas/viewLimit.ts`), the spot in it where the game places its
 * own ships, and how far a ship sits from that spot. The ship is its rooms
 * and its hull picture together; without either it is the cell (0, 0), so
 * an empty ship is placed by where its first room goes.
 */
import {
  CELL_SIZE,
  anchorPx,
  hullRectPx,
  roomsBoundsPx,
  updateLayout,
  type Point,
  type Rect,
  type Ship,
} from "../../core";
import { unionRects } from "../../canvas/viewport";
import { viewLimitPx } from "../../canvas/viewLimit";

/**
 * Where the game places the middle of its own player ships, in pixels from
 * the middle of the frame (negative: left of it and above it). Measured on
 * the game's 28 player ship layouts (each layout once): the middle of each
 * ship's rooms and hull picture together ({@link shipBoxPx}) lies 36 to
 * 81 px left of the frame's middle (65.4 on average) and 35 to 56 px above
 * it (50.1 on average); rounded to whole pixels.
 */
export const GAME_SHIP_SPOT: Point = { x: -65, y: -50 };

/** The rooms and the hull picture together in ship pixels; `undefined` when there is neither. */
export function shipBoxPx(ship: Ship): Rect | undefined {
  return unionRects([roomsBoundsPx(ship.layout), hullRectPx(ship.layout, ship.layoutXml)]);
}

/** The middle of what is placed on the screen: the ship's box, else the middle of cell (0, 0). */
function shipMiddlePx(ship: Ship): Point {
  const box = shipBoxPx(ship);
  if (box) return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  const a = anchorPx(ship.layout);
  return { x: a.x + CELL_SIZE / 2, y: a.y + CELL_SIZE / 2 };
}

/** The middle of the frame the game shows, in ship pixels. */
export function frameMiddlePx(ship: Ship): Point {
  const frame = viewLimitPx(ship.layout);
  return { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 };
}

/** Where the game would place this ship's middle ({@link GAME_SHIP_SPOT}), in ship pixels. */
export function shipSpotPx(ship: Ship): Point {
  const middle = frameMiddlePx(ship);
  return { x: middle.x + GAME_SHIP_SPOT.x, y: middle.y + GAME_SHIP_SPOT.y };
}

/**
 * How far the ship's middle lies from where the game places its own ships,
 * in pixels (positive: right of it and below it).
 */
export function offCentrePx(ship: Ship): Point {
  const middle = shipMiddlePx(ship);
  const spot = shipSpotPx(ship);
  return { x: middle.x - spot.x, y: middle.y - spot.y };
}

/**
 * Splits a whole-pixel shift of the ship on the screen into whole cells for
 * the anchor and the pixels left over (at most 17 either way) for
 * `HORIZONTAL`/`VERTICAL` (a positive value moves the ship right or down in
 * the frame).
 */
function split(total: number): { cells: number; pixels: number } {
  // `|| 0` keeps -0 out of the layout.
  const cells = Math.round(total / CELL_SIZE) || 0;
  return { cells, pixels: total - cells * CELL_SIZE || 0 };
}

/**
 * The whole-pixel shift nearest to `wanted` that keeps the rooms (from `low`
 * to `high` before the shift) between 0 and `size`. Rooms bigger than
 * `size` start at 0 and reach past `size`: past the frame's right or bottom
 * edge they are only out of sight, past its left or top edge the game may
 * crash.
 */
function fitShift(wanted: number, low: number, high: number, size: number): number {
  const min = -low;
  const max = size - high;
  if (min > max) return min;
  return Math.min(max, Math.max(min, Math.round(wanted)));
}

/**
 * The ship with its screen position set so that its middle lies where the
 * game places the middle of its own ships, as near as keeps every room inside
 * the frame: `X_OFFSET`/`Y_OFFSET` take the whole cells and
 * `HORIZONTAL`/`VERTICAL` the rest. Rooms wider or taller than the frame
 * start at its left or top edge and reach past the right or bottom one (the
 * Overview lists them as not visible in battle); no room is ever pushed past
 * the top or left edge. Rooms, doors and pictures keep their numbers, so
 * they all move together. Returns `ship` itself when nothing changes.
 */
export function centreOnScreen(ship: Ship): Ship {
  const { layout } = ship;
  const anchor = anchorPx(layout);
  const middle = shipMiddlePx(ship);
  const frame = viewLimitPx(layout);
  const rooms = roomsBoundsPx(layout);
  // Measured with the anchor at 0 and no shift, where the frame starts at pixel (0, 0): the spot
  // is at (w / 2, h / 2) + GAME_SHIP_SPOT and the ship's middle at (middle - anchor); a shift
  // moves the ship (rooms included) against the frame.
  const wantedX = frame.w / 2 + GAME_SHIP_SPOT.x - (middle.x - anchor.x);
  const wantedY = frame.h / 2 + GAME_SHIP_SPOT.y - (middle.y - anchor.y);
  const x = split(
    rooms
      ? fitShift(wantedX, rooms.x - anchor.x, rooms.x + rooms.w - anchor.x, frame.w)
      : Math.round(wantedX)
  );
  const y = split(
    rooms
      ? fitShift(wantedY, rooms.y - anchor.y, rooms.y + rooms.h - anchor.y, frame.h)
      : Math.round(wantedY)
  );
  const horizontal = x.pixels === 0 && layout.horizontal === undefined ? undefined : x.pixels;
  const vertical = y.pixels === 0 && layout.vertical === undefined ? undefined : y.pixels;
  if (
    (layout.xOffset ?? 0) === x.cells &&
    (layout.yOffset ?? 0) === y.cells &&
    layout.horizontal === horizontal &&
    layout.vertical === vertical
  )
    return ship;
  return updateLayout(ship, { xOffset: x.cells, yOffset: y.cells, horizontal, vertical });
}
