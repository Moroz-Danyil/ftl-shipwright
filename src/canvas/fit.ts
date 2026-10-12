import { hullRectPx, roomsBoundsPx, shieldEllipsePx, type Rect, type Ship } from "../core";
import { unionRects } from "./viewport";
import { VIEW_LIMIT_COLUMNS, VIEW_LIMIT_ROWS } from "./viewLimit";
import { CELL_SIZE } from "../core";

/** What "fit ship" shows: the hull picture, the rooms and the shield; an empty ship shows the game's frame size. */
export function shipBounds(ship: Ship): Rect {
  const hull = hullRectPx(ship.layout, ship.layoutXml);
  const ellipse = shieldEllipsePx(ship.layout);
  const shield = ellipse && {
    x: ellipse.cx - ellipse.rx,
    y: ellipse.cy - ellipse.ry,
    w: 2 * ellipse.rx,
    h: 2 * ellipse.ry,
  };
  return (
    unionRects([hull, roomsBoundsPx(ship.layout), shield]) ?? {
      x: 0,
      y: 0,
      w: VIEW_LIMIT_COLUMNS * CELL_SIZE,
      h: VIEW_LIMIT_ROWS * CELL_SIZE,
    }
  );
}
