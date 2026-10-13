/**
 * What lies under the pointer in Hull: a mount, a gib or one of the
 * ship's pictures. Picture sizes are those already read; a gib whose picture
 * is not read yet counts as one cell.
 */
import {
  CELL_SIZE,
  cloakPositionPx,
  floorPositionPx,
  gibPositionPx,
  hullRectPx,
  mountPositionPx,
  shieldEllipsePx,
  type Point,
  type Rect,
  type Ship,
} from "../core";
import type { MovablePicture } from "../app/art/pictures";
import type { ShipArt } from "../app/art/model";
import { loadedPictureNow } from "./pictures";

export const MOUNT_HIT_RADIUS = 11;

const inside = (r: Rect, p: Point) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** The nearest mount within reach of a ship pixel. */
export function mountAt(ship: Ship, p: Point, radius = MOUNT_HIT_RADIUS): number | undefined {
  let best: { index: number; d: number } | undefined;
  ship.layoutXml.mounts.forEach((m, index) => {
    const c = mountPositionPx(ship.layout, ship.layoutXml, m);
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d <= radius && (!best || d < best.d)) best = { index, d };
  });
  return best?.index;
}

/** A gib's rectangle in ship pixels. */
export function gibRectPx(ship: Ship, art: ShipArt, index: number): Rect {
  const gib = ship.layoutXml.gibs[index];
  const at = gibPositionPx(ship.layout, ship.layoutXml, gib);
  const picture = loadedPictureNow(art.source, art.gibs[index]);
  return { x: at.x, y: at.y, w: picture?.width ?? CELL_SIZE, h: picture?.height ?? CELL_SIZE };
}

/** The topmost gib under a ship pixel (later gibs are drawn on top). */
export function gibAt(ship: Ship, art: ShipArt, p: Point): number | undefined {
  for (let i = ship.layoutXml.gibs.length - 1; i >= 0; i--)
    if (inside(gibRectPx(ship, art, i), p)) return i;
  return undefined;
}

/** A movable picture's rectangle in ship pixels, when the picture is there and read. */
export function pictureRectPx(ship: Ship, art: ShipArt, picture: MovablePicture): Rect | undefined {
  const { layout, layoutXml } = ship;
  if (picture === "shield") {
    const e = shieldEllipsePx(layout);
    return e && { x: e.cx - e.rx, y: e.cy - e.ry, w: 2 * e.rx, h: 2 * e.ry };
  }
  if (picture === "hull") return art.hull ? hullRectPx(layout, layoutXml) : undefined;
  const loaded = loadedPictureNow(art.source, art[picture]);
  if (!loaded) return undefined;
  const at =
    picture === "floor" ? floorPositionPx(layout, layoutXml) : cloakPositionPx(layout, layoutXml);
  return { x: at.x, y: at.y, w: loaded.width, h: loaded.height };
}

/** The topmost picture under a ship pixel: cloak, floor, hull, then shield. */
export function pictureAt(
  ship: Ship,
  art: ShipArt,
  p: Point,
  visible: Record<MovablePicture, boolean>
): MovablePicture | undefined {
  const order: MovablePicture[] = ["cloak", "floor", "hull", "shield"];
  return order.find((picture) => {
    if (!visible[picture]) return false;
    const r = pictureRectPx(ship, art, picture);
    return r !== undefined && inside(r, p);
  });
}
