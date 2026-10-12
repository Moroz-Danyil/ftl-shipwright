/**
 * What lies under a point of the canvas: a crew station, a door (they sit on
 * walls, so they win over rooms) or a room.
 */
import {
  CELL_SIZE,
  doorSegmentPx,
  pxToCell,
  roomAtCell,
  stationCellPx,
  type Point,
  type Ship,
} from "../core";
import { stationOf, stationSystemIndices } from "../app/layout/stations";
import type { Target } from "../app/selection";

/** Half the length of the clickable part of a door, along its wall (ship pixels). */
const DOOR_HALF_LENGTH = CELL_SIZE / 2 - 4;

/** How far from a station cell's centre a click still hits the station (ship pixels). */
export const STATION_RADIUS = 10;

/** The centre of a system's station cell in ship pixels, when it has a station. */
export function stationCentre(ship: Ship, system: number): Point | undefined {
  const station = stationOf(ship, system);
  if (!station) return undefined;
  const p = stationCellPx(ship.layout, station.room, station.slot.number);
  return { x: p.x + CELL_SIZE / 2, y: p.y + CELL_SIZE / 2 };
}

function stationAt(ship: Ship, p: Point): number | undefined {
  for (const system of stationSystemIndices(ship)) {
    const c = stationCentre(ship, system);
    if (c && Math.hypot(p.x - c.x, p.y - c.y) <= STATION_RADIUS) return system;
  }
  return undefined;
}

function doorAtPoint(ship: Ship, p: Point, tolerance: number): number | undefined {
  let best: { index: number; distance: number } | undefined;
  ship.layout.doors.forEach((door, index) => {
    const s = doorSegmentPx(ship.layout, door);
    const cx = (s.x1 + s.x2) / 2;
    const cy = (s.y1 + s.y2) / 2;
    const across = door.vertical ? Math.abs(p.x - cx) : Math.abs(p.y - cy);
    const along = door.vertical ? Math.abs(p.y - cy) : Math.abs(p.x - cx);
    if (across <= tolerance && along <= DOOR_HALF_LENGTH) {
      if (!best || across < best.distance) best = { index, distance: across };
    }
  });
  return best?.index;
}

/**
 * The station, door or room at a ship pixel. `tolerance` is how far from a
 * wall (in ship pixels) a click still hits a door on it.
 */
export function hitTest(
  ship: Ship,
  p: Point,
  tolerance = 5,
  options: { stations?: boolean } = {}
): Target | null {
  if (options.stations !== false) {
    const system = stationAt(ship, p);
    if (system !== undefined) return { kind: "station", system };
  }
  const door = doorAtPoint(ship, p, tolerance);
  if (door !== undefined) return { kind: "door", index: door };
  const cell = pxToCell(ship.layout, p.x, p.y);
  const room = roomAtCell(ship.layout, cell.x, cell.y);
  return room ? { kind: "room", id: room.id } : null;
}

/** The door hit tolerance for a zoom: about 6 screen pixels, kept within 3 to 10 ship pixels. */
export function doorTolerance(scale: number): number {
  return Math.min(10, Math.max(3, 6 / scale));
}
