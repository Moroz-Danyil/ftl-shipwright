import { hullRectPx, roomsBoundsPx, shieldEllipsePx, type Rect, type Ship } from "../core";
import { shipBoxPx } from "../app/layout/screen";
import { unionRects } from "./viewport";
import { viewLimitPx } from "./viewLimit";

/** What "fit ship" shows: the hull picture, the rooms and the shield; an empty ship shows the game's frame. */
export function shipBounds(ship: Ship): Rect {
  const hull = hullRectPx(ship.layout, ship.layoutXml);
  const ellipse = shieldEllipsePx(ship.layout);
  const shield = ellipse && {
    x: ellipse.cx - ellipse.rx,
    y: ellipse.cy - ellipse.ry,
    w: 2 * ellipse.rx,
    h: 2 * ellipse.ry,
  };
  return unionRects([hull, roomsBoundsPx(ship.layout), shield]) ?? viewLimitPx(ship.layout);
}

/**
 * What a ship just opened shows: centred on its rooms and hull together
 * (the middle of the game's frame for an empty ship), and wide enough to
 * hold the shield on both sides of that middle too.
 */
export function openingBounds(ship: Ship): Rect {
  const all = shipBounds(ship);
  const box = shipBoxPx(ship) ?? all;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const halfW = Math.max(cx - all.x, all.x + all.w - cx);
  const halfH = Math.max(cy - all.y, all.y + all.h - cy);
  return { x: cx - halfW, y: cy - halfH, w: 2 * halfW, h: 2 * halfH };
}
