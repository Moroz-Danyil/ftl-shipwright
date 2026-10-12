/**
 * What lies under a point of the canvas: a door (they sit on walls, so they
 * win) or a room.
 */
import { CELL_SIZE, doorSegmentPx, pxToCell, roomAtCell, type Point, type Ship } from "../core";
import type { Selection } from "../app/store";

/** Half the length of the clickable part of a door, along its wall (ship pixels). */
const DOOR_HALF_LENGTH = CELL_SIZE / 2 - 4;

/**
 * The door or room at a ship pixel. `tolerance` is how far from a wall (in
 * ship pixels) a click still hits a door on it.
 */
export function hitTest(ship: Ship, p: Point, tolerance = 5): Selection | null {
  const layout = ship.layout;
  let best: { index: number; distance: number } | undefined;
  layout.doors.forEach((door, index) => {
    const s = doorSegmentPx(layout, door);
    const cx = (s.x1 + s.x2) / 2;
    const cy = (s.y1 + s.y2) / 2;
    const across = door.vertical ? Math.abs(p.x - cx) : Math.abs(p.y - cy);
    const along = door.vertical ? Math.abs(p.y - cy) : Math.abs(p.x - cx);
    if (across <= tolerance && along <= DOOR_HALF_LENGTH) {
      if (!best || across < best.distance) best = { index, distance: across };
    }
  });
  if (best) return { kind: "door", index: best.index };
  const cell = pxToCell(layout, p.x, p.y);
  const room = roomAtCell(layout, cell.x, cell.y);
  return room ? { kind: "room", id: room.id } : null;
}
