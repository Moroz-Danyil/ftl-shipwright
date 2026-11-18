/**
 * The rules for placing rooms: whole cells (negative ones too), for a
 * player ship never above or left of the part of the screen the game shows,
 * never overlapping another room. Rooms past its right or bottom edge are
 * allowed; they are not visible in battle. Moving rooms takes along the doors
 * that only touch the moved rooms; resizing a room keeps the doors where they
 * are and its stations on their cells. Positions are shown counted from the
 * top-left of the rooms, the way a saved layout writes them.
 */
import {
  addRoom,
  doorSides,
  roomsBoundsCells,
  stationCellToXY,
  stationInRoom,
  stationXYToCell,
  syncDoorRooms,
  updateBlueprint,
  updateLayout,
  type Point,
  type Rect,
  type Room,
  type Ship,
  type ShipLayout,
} from "../../core";
import {
  beyondBottomRight,
  beyondTopLeft,
  isPlayerShip,
  roomAreaCells,
  type CellBox,
} from "../../canvas/viewLimit";

/** Why rooms cannot go somewhere. */
export type PlaceProblem = "offScreen" | "overlap" | "tooSmall";

/** The result of a room edit: the changed ship, or why it was refused. */
export type EditResult =
  { ship: Ship; problem?: undefined } | { ship?: undefined; problem: PlaceProblem };

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Where a ship's rooms may go: for a player ship the cells of the game's
 * screen frame ({@link roomAreaCells}), else anywhere (`undefined`).
 */
export function roomArea(ship: Ship): CellBox | undefined {
  return isPlayerShip(ship.blueprint.name) ? roomAreaCells(ship.layout) : undefined;
}

/**
 * Why the rectangles (cells) cannot be rooms, or `undefined` when they can.
 * Rooms whose ids are in `ignore` (the ones being moved) do not count as
 * obstacles; with an `area`, no rectangle may reach past its top or left
 * edge.
 */
export function placementProblem(
  rooms: Room[],
  rects: Rect[],
  ignore: ReadonlySet<number> = new Set(),
  area?: CellBox
): PlaceProblem | undefined {
  for (const r of rects) if (r.w < 1 || r.h < 1) return "tooSmall";
  if (area && rects.some((r) => beyondTopLeft(area, r))) return "offScreen";
  for (const r of rects)
    for (const room of rooms) if (!ignore.has(room.id) && rectsOverlap(r, room)) return "overlap";
  return undefined;
}

/**
 * The cell that positions are shown from: the smallest room x and the
 * smallest room y, or (0, 0) without rooms. A saved layout starts its rooms
 * there, so a position counted from it is the one the file gets.
 */
export function shownOrigin(layout: Pick<ShipLayout, "rooms">): Point {
  const b = roomsBoundsCells(layout);
  return b ? { x: b.x, y: b.y } : { x: 0, y: 0 };
}

/** A cell as the inspector shows it: counted from {@link shownOrigin}. */
export function shownCell(layout: Pick<ShipLayout, "rooms">, cell: Point): Point {
  const o = shownOrigin(layout);
  return { x: cell.x - o.x, y: cell.y - o.y };
}

/** True when one of these rooms of a player ship reaches past the right or bottom edge of the screen. */
export function outOfView(ship: Ship, ids: number[]): boolean {
  const area = roomArea(ship);
  return (
    area !== undefined &&
    ship.layout.rooms.some((r) => ids.includes(r.id) && beyondBottomRight(area, r))
  );
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
  return placementProblem(
    ship.layout.rooms,
    shiftedRooms(ship.layout, ids, dx, dy),
    new Set(ids),
    roomArea(ship)
  );
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
  const problem = placementProblem(ship.layout.rooms, [rect], new Set(), roomArea(ship));
  if (problem) return { problem };
  return { ship: syncDoorRooms(addRoom(ship, rect)) };
}

/**
 * Gives a room a new rectangle of cells (the Select tool's handles, the
 * inspector's size fields). Doors stay where they are and take their room ids
 * from the new geometry; a door with the room on both sides (its wall now
 * lies inside the room) is removed. A station keeps its cell while that cell
 * is still in the room; otherwise its number stays as it is, and the Overview
 * reports a station outside its room.
 */
export function resizeRoom(ship: Ship, id: number, rect: Rect): EditResult {
  const room = ship.layout.rooms.find((r) => r.id === id);
  if (!room) return { ship };
  const next: Room = { id, x: rect.x, y: rect.y, w: rect.w, h: rect.h };
  if (next.x === room.x && next.y === room.y && next.w === room.w && next.h === room.h)
    return { ship };
  const problem = placementProblem(ship.layout.rooms, [next], new Set([id]), roomArea(ship));
  if (problem) return { problem };
  const rooms = ship.layout.rooms.map((r) => (r.id === id ? next : r));
  const doors = ship.layout.doors.filter((door) => {
    const [a, b] = doorSides({ rooms }, door);
    return !(a === id && b === id);
  });
  const systems = ship.blueprint.systems.map((s) => {
    const number = s.slot?.number;
    if (s.room !== id || !s.slot || number === undefined || !stationInRoom(room, number)) return s;
    const cell = stationCellToXY(room, number);
    const x = room.x + cell.x - next.x;
    const y = room.y + cell.y - next.y;
    if (x < 0 || y < 0 || x >= next.w || y >= next.h) return s;
    const kept = stationXYToCell(next, x, y);
    return kept === number ? s : { ...s, slot: { ...s.slot, number: kept } };
  });
  const resized = updateBlueprint(updateLayout(ship, { rooms, doors }), { systems });
  return { ship: syncDoorRooms(resized) };
}

/**
 * Changes a room's position and/or size (cells). A new position moves the
 * room like a drag (with its doors); a new size is applied as by
 * {@link resizeRoom}. Both follow the placement rules.
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
  const problem = placementProblem(ship.layout.rooms, [target], new Set([id]), roomArea(ship));
  if (problem) return { problem };
  const moved = moveRooms(ship, [id], target.x - room.x, target.y - room.y);
  if (!moved.ship) return moved;
  return resizeRoom(moved.ship, id, target);
}
