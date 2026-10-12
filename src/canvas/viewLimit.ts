/**
 * The part of a player ship the game shows on screen, measured in the game:
 * the right edge lies at cell `19 - X_OFFSET - HORIZONTAL / 35` and the
 * bottom edge at cell `13 - Y_OFFSET - VERTICAL / 35`, in the ship's own cell
 * coordinates. The frame is 19 × 13 cells, so its left and top edges lie
 * 19 and 13 cells before those.
 */
import { CELL_SIZE, anchorCells, type Rect, type ShipLayout } from "../core";

export const VIEW_LIMIT_COLUMNS = 19;
export const VIEW_LIMIT_ROWS = 13;

export interface CellBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The frame in the ship's own cells (cell 0 = the anchor); may be fractional. */
export function viewLimitCells(
  layout: Pick<ShipLayout, "xOffset" | "yOffset" | "horizontal" | "vertical">
): CellBox {
  const anchor = anchorCells(layout);
  const right = VIEW_LIMIT_COLUMNS - anchor.x - (layout.horizontal ?? 0) / CELL_SIZE;
  const bottom = VIEW_LIMIT_ROWS - anchor.y - (layout.vertical ?? 0) / CELL_SIZE;
  return {
    left: right - VIEW_LIMIT_COLUMNS,
    top: bottom - VIEW_LIMIT_ROWS,
    right,
    bottom,
  };
}

/** The frame in ship pixels. */
export function viewLimitPx(
  layout: Pick<ShipLayout, "xOffset" | "yOffset" | "horizontal" | "vertical">
): Rect {
  const cells = viewLimitCells(layout);
  const anchor = anchorCells(layout);
  return {
    x: (anchor.x + cells.left) * CELL_SIZE,
    y: (anchor.y + cells.top) * CELL_SIZE,
    w: VIEW_LIMIT_COLUMNS * CELL_SIZE,
    h: VIEW_LIMIT_ROWS * CELL_SIZE,
  };
}

/** True for ships the player can fly (only these get the frame). */
export function isPlayerShip(blueprintName: string): boolean {
  return blueprintName.startsWith("PLAYER_SHIP_");
}
