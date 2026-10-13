/**
 * System edits on the open ship, each one undo step.
 */
import { selectionOf } from "./selection";
import {
  artilleryWeapons,
  maxLevel,
  placeSystem,
  removeSystemNamed,
  setArtilleryWeapon,
  setInstalled,
  setInterior,
  setLevel,
  setUpgradeLimit,
  type SystemProblem,
} from "./systems/rules";
import { useEditor } from "./store";
import type { Ship } from "../core";

const present = () => useEditor.getState().doc?.history.present.ship;
const catalogs = () => useEditor.getState().game.data?.catalogs;

/** The artillery weapon a newly placed artillery system fires: the game's first. */
function defaultArtilleryWeapon(): string | undefined {
  const weapons = artilleryWeapons(catalogs()?.weapons ?? []);
  return (weapons.find((w) => w.name === "ARTILLERY_FED") ?? weapons[0])?.name;
}

/**
 * Places a system in a room (or moves it there) and selects the room.
 * Returns the problem when the rules refuse it.
 */
export function placeSystemInRoom(system: string, roomId: number): SystemProblem | undefined {
  const ship = present();
  if (!ship) return undefined;
  const result = placeSystem(ship, system, roomId, {
    catalog: catalogs()?.systems,
    artilleryWeapon: defaultArtilleryWeapon(),
  });
  if (result.problem) return result.problem;
  useEditor.getState().edit(() => result.ship, selectionOf({ kind: "room", id: roomId }));
  return undefined;
}

export function removeSystemFromShip(system: string): void {
  useEditor.getState().edit((s) => removeSystemNamed(s, system));
}

/** The highest starting level of the system at this index. */
export function levelLimit(ship: Ship, index: number): number {
  return maxLevel(catalogs()?.systems, ship.blueprint.systems[index]?.system ?? "");
}

export function setSystemInstalled(index: number, installed: boolean): void {
  useEditor.getState().edit((s) => setInstalled(s, index, installed));
}

export function setSystemLevel(index: number, level: number): void {
  useEditor.getState().edit((s) => setLevel(s, index, level, levelLimit(s, index)));
}

export function setSystemUpgradeLimit(index: number, limit: number): void {
  useEditor.getState().edit((s) => setUpgradeLimit(s, index, limit, levelLimit(s, index)));
}

export function setSystemInterior(index: number, img: string | undefined): void {
  useEditor.getState().edit((s) => setInterior(s, index, img));
}

export function setSystemWeapon(index: number, weapon: string): void {
  useEditor.getState().edit((s) => setArtilleryWeapon(s, index, weapon));
}
