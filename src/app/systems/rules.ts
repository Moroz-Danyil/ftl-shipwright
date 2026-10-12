/**
 * The rules for systems: each system at most once per ship, several systems
 * may share a room but only one of them is installed at the start, levels
 * within the game's limits, and the warnings the game's own ships never need.
 */
import {
  addSystem,
  removeSystem,
  updateSystem,
  type Room,
  type Ship,
  type ShipSystem,
  type SystemCatalogEntry,
} from "../../core";

export type SystemGroup = "core" | "subsystems" | "special";

export const SYSTEM_GROUPS: Record<SystemGroup, string[]> = {
  core: ["shields", "engines", "oxygen", "weapons", "medbay", "clonebay"],
  subsystems: ["pilot", "sensors", "doors", "battery"],
  special: ["drones", "cloaking", "hacking", "mind", "teleporter", "artillery"],
};

/** The pairs of systems the game's own ships put in one room. */
export const USUAL_PAIRS: Array<[string, string]> = [
  ["medbay", "clonebay"],
  ["mind", "teleporter"],
];

/** Upper level when the game has no `systemBlueprint` for a system (artillery has none). */
export const FALLBACK_MAX_LEVEL: Record<string, number> = { artillery: 4 };
const DEFAULT_MAX_LEVEL = 8;

export type SystemProblem = "noRoom" | "sameRoom";

export type SystemEdit =
  { ship: Ship; problem?: undefined } | { ship?: undefined; problem: SystemProblem };

/** The index of a system in the blueprint, or -1. */
export function systemIndex(ship: Ship, system: string): number {
  return ship.blueprint.systems.findIndex((s) => s.system === system);
}

/** The indices of the systems in a room. */
export function systemsInRoom(ship: Ship, roomId: number): number[] {
  const out: number[] = [];
  ship.blueprint.systems.forEach((s, i) => {
    if (s.room === roomId) out.push(i);
  });
  return out;
}

/** True unless the system is bought later (`start="false"`). */
export function isInstalled(system: ShipSystem): boolean {
  return system.start !== false;
}

/** The highest starting level: the game's `maxPower`, else a known fallback. */
export function maxLevel(catalog: SystemCatalogEntry[] | undefined, system: string): number {
  const entry = catalog?.find((s) => s.name === system);
  return entry?.maxPower ?? FALLBACK_MAX_LEVEL[system] ?? DEFAULT_MAX_LEVEL;
}

/** The level a newly placed system starts at. */
function startLevel(catalog: SystemCatalogEntry[] | undefined, system: string): number {
  const entry = catalog?.find((s) => s.name === system);
  return Math.min(entry?.startPower ?? 1, maxLevel(catalog, system));
}

function hasInstalledSystem(ship: Ship, roomId: number, except = -1): boolean {
  return systemsInRoom(ship, roomId).some(
    (i) => i !== except && isInstalled(ship.blueprint.systems[i])
  );
}

export interface PlaceOptions {
  catalog?: SystemCatalogEntry[];
  /** For artillery: the weapon to fire when the ship has none set. */
  artilleryWeapon?: string;
}

/**
 * Puts a system into a room, or moves it there when the ship already has it.
 * In a room that already has an installed system the newcomer is bought
 * later. A moved system loses its crew station (and medbay or clonebay their
 * kept cell), since the cell may not exist in the new room.
 */
export function placeSystem(
  ship: Ship,
  system: string,
  roomId: number,
  options: PlaceOptions = {}
): SystemEdit {
  if (!ship.layout.rooms.some((r) => r.id === roomId)) return { problem: "noRoom" };
  const index = systemIndex(ship, system);
  const start = !hasInstalledSystem(ship, roomId, index);
  if (index !== -1) {
    const old = ship.blueprint.systems[index];
    if (old.room === roomId) return { problem: "sameRoom" };
    const moved: ShipSystem = { ...old, room: roomId, start };
    delete moved.slot;
    const systems = ship.blueprint.systems.map((s, i) => (i === index ? moved : s));
    return { ship: { ...ship, blueprint: { ...ship.blueprint, systems } } };
  }
  const added: ShipSystem = {
    system,
    power: startLevel(options.catalog, system),
    room: roomId,
    start,
  };
  if (system === "artillery" && options.artilleryWeapon) added.weapon = options.artilleryWeapon;
  return { ship: addSystem(ship, added) };
}

/** Removes a system from the ship. */
export function removeSystemNamed(ship: Ship, system: string): Ship {
  const index = systemIndex(ship, system);
  return index === -1 ? ship : removeSystem(ship, index);
}

/** Makes this system the one installed at the start in its room; the others there become bought later. */
export function setInstalled(ship: Ship, index: number, installed: boolean): Ship {
  const target = ship.blueprint.systems[index];
  if (!target) return ship;
  if (!installed) return isInstalled(target) ? updateSystem(ship, index, { start: false }) : ship;
  const systems = ship.blueprint.systems.map((s, i) => {
    if (i === index) return s.start === true ? s : { ...s, start: true };
    if (s.room === target.room && isInstalled(s)) return { ...s, start: false };
    return s;
  });
  return { ...ship, blueprint: { ...ship.blueprint, systems } };
}

/** Sets the starting level, kept within 1 and the upper limit. */
export function setLevel(ship: Ship, index: number, level: number, max: number): Ship {
  const system = ship.blueprint.systems[index];
  if (!system) return ship;
  const power = Math.max(1, Math.min(max, Math.round(level)));
  return power === system.power ? ship : updateSystem(ship, index, { power });
}

/** Sets the upgrade limit (`max`), kept within 1 and the game's highest level. */
export function setUpgradeLimit(ship: Ship, index: number, limit: number, max: number): Ship {
  const system = ship.blueprint.systems[index];
  if (!system) return ship;
  const value = Math.max(1, Math.min(max, Math.round(limit)));
  return value === system.max ? ship : updateSystem(ship, index, { max: value });
}

/** Whether the upgrade limit is shown: the ship already has one, or it is not a player ship. */
export function showsUpgradeLimit(ship: Ship, system: ShipSystem): boolean {
  return system.max !== undefined || !ship.blueprint.name.startsWith("PLAYER_SHIP_");
}

/** Sets or removes (`undefined`) the room's interior picture of a system. */
export function setInterior(ship: Ship, index: number, img: string | undefined): Ship {
  const system = ship.blueprint.systems[index];
  if (!system || system.img === img) return ship;
  const next: ShipSystem = { ...system };
  if (img === undefined) delete next.img;
  else next.img = img;
  const systems = ship.blueprint.systems.map((s, i) => (i === index ? next : s));
  return { ...ship, blueprint: { ...ship.blueprint, systems } };
}

export function setArtilleryWeapon(ship: Ship, index: number, weapon: string): Ship {
  const system = ship.blueprint.systems[index];
  if (!system || system.weapon === weapon) return ship;
  return updateSystem(ship, index, { weapon });
}

/** True when the systems sharing one room are not one of the game's usual pairs. */
export function isUnusualMix(systems: string[]): boolean {
  if (systems.length < 2) return false;
  return !USUAL_PAIRS.some((pair) => systems.every((s) => pair.includes(s)));
}

/** Rooms whose systems are an unusual mix. */
export function roomsWithUnusualMix(ship: Ship): number[] {
  return ship.layout.rooms
    .filter((room) =>
      isUnusualMix(systemsInRoom(ship, room.id).map((i) => ship.blueprint.systems[i].system))
    )
    .map((r) => r.id);
}

/** Rooms with more than one system installed at the start. */
export function roomsWithSeveralInstalled(ship: Ship): number[] {
  return ship.layout.rooms
    .filter(
      (room) =>
        systemsInRoom(ship, room.id).filter((i) => isInstalled(ship.blueprint.systems[i])).length >
        1
    )
    .map((r) => r.id);
}

/** True when a picture of this size fits the room exactly (35 px per cell). */
export function interiorFits(
  room: Pick<Room, "w" | "h">,
  size: { width: number; height: number }
): boolean {
  return size.width === room.w * 35 && size.height === room.h * 35;
}

/** The interior pictures meant for a system: the names starting with `room_<system>`. */
export function interiorsFor<T extends { name: string }>(all: T[], system: string): T[] {
  const prefix = `room_${system}`;
  return all.filter((p) => p.name === prefix || p.name.startsWith(`${prefix}_`));
}

/** The artillery weapons of the game (names starting with `ARTILLERY`). */
export function artilleryWeapons<T extends { name: string }>(weapons: T[]): T[] {
  return weapons.filter((w) => w.name.startsWith("ARTILLERY"));
}
