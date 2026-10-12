/**
 * The rules for placing rooms: whole cells, never left of or above cell 0,
 * never overlapping another room. Moving rooms takes along the doors that
 * only touch the moved rooms.
 */
import {
  addRoom,
  doorSides,
  syncDoorRooms,
  updateLayout,
  type Point,
  type Rect,
  type Room,
  type Ship,
  type ShipLayout,
} from "../../core";

/** Why rooms cannot go somewhere. */
export type PlaceProblem = "belowZero" | "overlap" | "tooSmall";

/** The result of a room edit: the changed ship, or why it was refused. */
export type EditResult =
  { ship: Ship; problem?: undefined } | { ship?: undefined; problem: PlaceProblem };

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Why the rectangles (cells) cannot be rooms, or `undefined` when they can.
 * Rooms whose ids are in `ignore` (the ones being moved) do not count as
 * obstacles.
 */
export function placementProblem(
  rooms: Room[],
  rects: Rect[],
  ignore: ReadonlySet<number> = new Set()
): PlaceProblem | undefined {
  for (const r of rects) {
    if (r.w < 1 || r.h < 1) return "tooSmall";
    if (r.x < 0 || r.y < 0) return "belowZero";
  }
  for (const r of rects)
    for (const room of rooms) if (!ignore.has(room.id) && rectsOverlap(r, room)) return "overlap";
  return undefined;
}

/** The rooms with these ids, shifted by whole cells. */
export function shiftedRooms(
  layout: Pick<ShipLayout, "rooms">,
  ids: number[],
  dx: number,
  dy: number
): Room[] {
  return layout.rooms
    .filter((r) => ids.includes(r.id))
    .map((r) => ({ ...r, x: r.x + dx, y: r.y + dy }));
}

/**
 * The doors that move with these rooms: every room a door touches is one of
 * them (an airlock moves with its room). Doors touching no room stay.
 */
export function doorsMovingWith(
  layout: Pick<ShipLayout, "rooms" | "doors">,
  ids: number[]
): number[] {
  const moving = new Set(ids);
  const out: number[] = [];
  layout.doors.forEach((door, index) => {
    const touched = doorSides(layout, door).filter((id) => id !== -1);
    if (touched.length > 0 && touched.every((id) => moving.has(id))) out.push(index);
  });
  return out;
}

/** Why moving these rooms by (dx, dy) cells is refused, or `undefined` when it is allowed. */
export function moveProblem(
  ship: Ship,
  ids: number[],
  dx: number,
  dy: number
): PlaceProblem | undefined {
  return placementProblem(ship.layout.rooms, shiftedRooms(ship.layout, ids, dx, dy), new Set(ids));
}

/**
 * Moves rooms by whole cells, with the doors that move with them; door room
 * ids are then updated from the geometry.
 */
export function moveRooms(ship: Ship, ids: number[], dx: number, dy: number): EditResult {
  if (ids.length === 0 || (dx === 0 && dy === 0)) return { ship };
  const problem = moveProblem(ship, ids, dx, dy);
  if (problem) return { problem };
  const doorSet = new Set(doorsMovingWith(ship.layout, ids));
  const idSet = new Set(ids);
  const rooms = ship.layout.rooms.map((r) =>
    idSet.has(r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r
  );
  const doors = ship.layout.doors.map((d, i) =>
    doorSet.has(i) ? { ...d, x: d.x + dx, y: d.y + dy } : d
  );
  return { ship: syncDoorRooms(updateLayout(ship, { rooms, doors })) };
}

/** The room rectangle spanned by two cells (both included). */
export function rectFromCells(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 };
}

/** Adds a room (it gets the next id) when the rectangle is free. */
export function addRoomChecked(ship: Ship, rect: Rect): EditResult {
  const problem = placementProblem(ship.layout.rooms, [rect]);
  if (problem) return { problem };
  return { ship: syncDoorRooms(addRoom(ship, rect)) };
}

/**
 * Changes a room's position and/or size (cells). A new position moves the
 * room like a drag (with its doors); a new size keeps the doors where they
 * are. Both follow the placement rules.
 */
export function changeRoom(ship: Ship, id: number, patch: Partial<Rect>): EditResult {
  const room = ship.layout.rooms.find((r) => r.id === id);
  if (!room) return { ship };
  const target = {
    x: patch.x ?? room.x,
    y: patch.y ?? room.y,
    w: patch.w ?? room.w,
    h: patch.h ?? room.h,
  };
  const problem = placementProblem(ship.layout.rooms, [target], new Set([id]));
  if (problem) return { problem };
  const moved = moveRooms(ship, [id], target.x - room.x, target.y - room.y);
  if (!moved.ship) return moved;
  if (target.w === room.w && target.h === room.h) return moved;
  const rooms = moved.ship.layout.rooms.map((r) =>
    r.id === id ? { ...r, w: target.w, h: target.h } : r
  );
  return { ship: syncDoorRooms(updateLayout(moved.ship, { rooms })) };
}
