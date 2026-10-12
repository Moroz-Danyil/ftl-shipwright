/**
 * Placing doors: the wall segment nearest to the pointer, one cell long, on a
 * cell edge with a room on at least one side.
 */
import {
  CELL_SIZE,
  addDoor,
  anchorPx,
  doorSides,
  type Door,
  type Point,
  type Ship,
  type ShipLayout,
} from "../../core";

/** A wall segment in the door's own terms (see the core's `Door`). */
export type WallSegment = Pick<Door, "x" | "y" | "vertical">;

/** True when a door could stand on the segment: a room on one side, not inside one room. */
export function isDoorWall(layout: Pick<ShipLayout, "rooms">, wall: WallSegment): boolean {
  const [a, b] = doorSides(layout, wall);
  if (a === -1 && b === -1) return false;
  return a !== b;
}

/** The usable wall segment nearest to a ship pixel, if there is one in the cell under it. */
export function nearestWall(
  layout: Pick<ShipLayout, "rooms" | "xOffset" | "yOffset">,
  p: Point
): WallSegment | undefined {
  const anchor = anchorPx(layout);
  const fx = (p.x - anchor.x) / CELL_SIZE;
  const fy = (p.y - anchor.y) / CELL_SIZE;
  const vertical = { x: Math.round(fx), y: Math.floor(fy), vertical: true };
  const horizontal = { x: Math.floor(fx), y: Math.round(fy), vertical: false };
  const candidates = [
    { wall: vertical, distance: Math.abs(fx - vertical.x) },
    { wall: horizontal, distance: Math.abs(fy - horizontal.y) },
  ].sort((a, b) => a.distance - b.distance);
  return candidates.find((c) => isDoorWall(layout, c.wall))?.wall;
}

/** The index of the door on this segment, or -1. */
export function doorAt(layout: Pick<ShipLayout, "doors">, wall: WallSegment): number {
  return layout.doors.findIndex(
    (d) => d.x === wall.x && d.y === wall.y && d.vertical === wall.vertical
  );
}

/**
 * Adds a door on the segment, with room ids from the geometry. When a door is
 * already there, the ship is returned unchanged with that door's index.
 */
export function addDoorOnWall(ship: Ship, wall: WallSegment): { ship: Ship; index: number } {
  const existing = doorAt(ship.layout, wall);
  if (existing !== -1) return { ship, index: existing };
  return { ship: addDoor(ship, wall), index: ship.layout.doors.length };
}

/** The doors on the walls of a room (doors with the room on one side). */
export function doorsOfRoom(layout: Pick<ShipLayout, "rooms" | "doors">, roomId: number): number[] {
  const out: number[] = [];
  layout.doors.forEach((door, index) => {
    if (doorSides(layout, door).includes(roomId)) out.push(index);
  });
  return out;
}
