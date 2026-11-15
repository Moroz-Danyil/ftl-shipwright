/** Where the objects of a selection are on the ship, for the flash after a click in the Overview. */
import { CELL_SIZE, mountPositionPx, roomRectPx, type Rect, type Ship } from "../core";
import type { ShipArt } from "../app/art/model";
import type { Selection } from "../app/selection";
import { MOUNT_HIT_RADIUS, gibRectPx } from "./artHitTest";
import { doorRectPx } from "./doors";
import { stationCentre } from "./hitTest";

/** The rectangles (ship pixels) of the rooms, doors, stations, mounts and gibs of a selection. */
export function objectRectsPx(ship: Ship, art: ShipArt, objects: Selection): Rect[] {
  const { layout, layoutXml } = ship;
  const rects: Rect[] = [];
  for (const id of objects.rooms) {
    const room = layout.rooms.find((r) => r.id === id);
    if (room) rects.push(roomRectPx(layout, room));
  }
  for (const index of objects.doors) {
    const door = layout.doors[index];
    if (door) rects.push(doorRectPx(layout, door));
  }
  for (const system of objects.stations) {
    const c = stationCentre(ship, system);
    if (c)
      rects.push({ x: c.x - CELL_SIZE / 2, y: c.y - CELL_SIZE / 2, w: CELL_SIZE, h: CELL_SIZE });
  }
  for (const index of objects.mounts) {
    const mount = layoutXml.mounts[index];
    if (!mount) continue;
    const c = mountPositionPx(layout, layoutXml, mount);
    const r = MOUNT_HIT_RADIUS;
    rects.push({ x: c.x - r, y: c.y - r, w: 2 * r, h: 2 * r });
  }
  for (const index of objects.gibs)
    if (layoutXml.gibs[index]) rects.push(gibRectPx(ship, art, index));
  return rects;
}
