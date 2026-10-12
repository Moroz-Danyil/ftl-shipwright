/**
 * Crew stations: the cell of a system's room where a crew member mans it,
 * and the direction they face. Only the systems below have stations with a
 * direction in the game's files; medbay and clonebay keep just a cell number,
 * which the editor leaves as it is.
 */
import {
  roomContainsCell,
  stationCellToXY,
  stationXYToCell,
  updateSystem,
  type Point,
  type Room,
  type Ship,
  type StationDirection,
  type StationSlot,
} from "../../core";

export const STATION_SYSTEMS = [
  "pilot",
  "doors",
  "sensors",
  "weapons",
  "shields",
  "engines",
  "hacking",
] as const;

export const DIRECTIONS = ["up", "down", "left", "right"] as const;

export function isStationSystem(system: string): boolean {
  return (STATION_SYSTEMS as readonly string[]).includes(system);
}

/** Indices (in the blueprint) of the systems with stations, in the ship's order. */
export function stationSystemIndices(ship: Ship): number[] {
  const out: number[] = [];
  ship.blueprint.systems.forEach((s, i) => {
    if (isStationSystem(s.system)) out.push(i);
  });
  return out;
}

/** The systems with stations in one room. */
export function stationSystemsInRoom(ship: Ship, roomId: number): number[] {
  return stationSystemIndices(ship).filter((i) => ship.blueprint.systems[i].room === roomId);
}

/** The station cell index of a cell (ship cell coordinates) inside the room, or `undefined`. */
export function stationCellAt(room: Room, cell: Point): number | undefined {
  if (!roomContainsCell(room, cell.x, cell.y)) return undefined;
  return stationXYToCell(room, cell.x - room.x, cell.y - room.y);
}

/** The directions that face a wall of the room from this station cell. */
export function wallDirections(room: Pick<Room, "w" | "h">, number: number): StationDirection[] {
  const { x, y } = stationCellToXY(room, number);
  const out: StationDirection[] = [];
  if (x === 0) out.push("left");
  if (x === room.w - 1) out.push("right");
  if (y === 0) out.push("up");
  if (y === room.h - 1) out.push("down");
  return out;
}

/** The direction of the nearest wall (left and right win ties). */
export function nearestWallDirection(
  room: Pick<Room, "w" | "h">,
  number: number
): StationDirection {
  const { x, y } = stationCellToXY(room, number);
  const options: Array<[StationDirection, number]> = [
    ["left", x],
    ["right", room.w - 1 - x],
    ["up", y],
    ["down", room.h - 1 - y],
  ];
  return options.reduce((best, o) => (o[1] < best[1] ? o : best))[0];
}

/**
 * Puts a system's station on a cell of its room. The direction stays when it
 * still faces a wall from the new cell; otherwise it turns to the nearest wall.
 */
export function placeStation(ship: Ship, systemIndex: number, number: number): Ship {
  const system = ship.blueprint.systems[systemIndex];
  const room = ship.layout.rooms.find((r) => r.id === system?.room);
  if (!system || !room) return ship;
  const old = system.slot?.direction;
  const direction =
    old !== undefined && wallDirections(room, number).includes(old)
      ? old
      : nearestWallDirection(room, number);
  if (system.slot?.number === number && system.slot.direction === direction) return ship;
  return updateSystem(ship, systemIndex, { slot: { ...system.slot, number, direction } });
}

export function setStationDirection(
  ship: Ship,
  systemIndex: number,
  direction: StationDirection
): Ship {
  const slot = ship.blueprint.systems[systemIndex]?.slot;
  if (!slot || slot.direction === direction) return ship;
  return updateSystem(ship, systemIndex, { slot: { ...slot, direction } });
}

/** Removes a system's station (its `<slot>`). */
export function removeStation(ship: Ship, systemIndex: number): Ship {
  const system = ship.blueprint.systems[systemIndex];
  if (!system?.slot) return ship;
  const rest = { ...system };
  delete rest.slot;
  const systems = ship.blueprint.systems.map((s, i) => (i === systemIndex ? rest : s));
  return { ...ship, blueprint: { ...ship.blueprint, systems } };
}

/** The station's cell, when the system has one inside its room. */
export function stationOf(
  ship: Ship,
  systemIndex: number
): { room: Room; slot: StationSlot & { number: number } } | undefined {
  const system = ship.blueprint.systems[systemIndex];
  const number = system?.slot?.number;
  if (!system || number === undefined || number < 0) return undefined;
  const room = ship.layout.rooms.find((r) => r.id === system.room);
  if (!room || number >= room.w * room.h) return undefined;
  return { room, slot: { ...system.slot, number } };
}
