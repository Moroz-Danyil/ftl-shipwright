/**
 * Loadout and Hangar edits on the open ship, each one undo step.
 */
import type { Platform } from "../platform/types";
import type { Texts } from "../text";
import { rename, setCrew, setHull, setReactor, setText, type TextField } from "./details/rules";
import {
  addAugment,
  addItem,
  items,
  moveItem,
  removeAugment,
  removeItems,
  setDroneParts,
  setMissiles,
  setSlots,
  type LoadoutKind,
} from "./loadout/rules";
import { EMPTY_SELECTION, selectionOf } from "./selection";
import { useEditor } from "./store";

const state = () => useEditor.getState();
const ship = () => state().doc?.history.present.ship;

/** Puts a weapon or drone in the next free slot and selects it; says so when the slots are full. */
export function addLoadoutItem(kind: LoadoutKind, name: string, texts: Texts): boolean {
  const current = ship();
  if (!current) return false;
  const result = addItem(current, kind, name);
  if (result.problem) {
    state().setNotice({ kind: "info", text: texts.loadout.full[kind] });
    return false;
  }
  const index = items(current, kind).length;
  state().edit(() => result.ship, selectionOf({ kind, index }));
  return true;
}

/** Removes the selected weapon and drone slots; false when none is selected. */
export function removeSelectedSlots(): boolean {
  const { weapons, drones } = state().selection;
  if (weapons.length + drones.length === 0) return false;
  state().edit(
    (s) => removeItems(removeItems(s, "weapon", weapons), "drone", drones),
    EMPTY_SELECTION
  );
  return true;
}

/** Moves a weapon or drone one slot earlier or later; it stays selected. */
export function moveSlot(kind: LoadoutKind, index: number, step: -1 | 1): void {
  const current = ship();
  if (!current) return;
  const other = index + step;
  if (other < 0 || other >= items(current, kind).length) return;
  state().edit((s) => moveItem(s, kind, index, step), selectionOf({ kind, index: other }));
}

export const setSlotCount = (kind: LoadoutKind, n: number) =>
  state().edit((s) => setSlots(s, kind, n));
export const setStartingMissiles = (n: number) => state().edit((s) => setMissiles(s, n));
export const setStartingDroneParts = (n: number) => state().edit((s) => setDroneParts(s, n));

/** Adds an augment; says why when there are three already or it does not stack. */
export function addShipAugment(name: string, texts: Texts): boolean {
  const current = ship();
  if (!current) return false;
  const stackable = state().game.data?.catalogs.augments.find((a) => a.name === name)?.stackable;
  const result = addAugment(current, name, stackable === true);
  if (result.problem) {
    state().setNotice({ kind: "info", text: texts.loadout.augmentProblems[result.problem] });
    return false;
  }
  state().edit(() => result.ship);
  return true;
}

export const removeShipAugment = (index: number) => state().edit((s) => removeAugment(s, index));

export const setShipText = (field: TextField, text: string) =>
  state().edit((s) => setText(s, field, text));

/** True while the open ship is a game ship edited in place under its own name. */
export function isGameShipInPlace(): boolean {
  const { doc, game } = state();
  const name = doc?.history.present.ship.blueprint.name;
  return doc?.origin?.kind === "game" && !!game.data?.catalogs.ships.some((s) => s.name === name);
}

/**
 * Changes the save name. A game ship edited in place asks first, since it is
 * then saved as a separate ship. Returns false when refused or invalid.
 */
export async function renameShip(
  platform: Platform,
  texts: Texts,
  ids: { name?: string; base?: string }
): Promise<boolean> {
  const current = ship();
  if (!current) return false;
  const next = rename(current, ids);
  if (!next) {
    state().setNotice({ kind: "info", text: texts.details.invalidId });
    return false;
  }
  if (next === current) return true;
  if (isGameShipInPlace() && !(await platform.confirm(texts.details.confirmRename))) return false;
  state().edit((s) => rename(s, ids) ?? s);
  return true;
}

export const setShipHull = (n: number) => state().edit((s) => setHull(s, n));
export const setShipReactor = (n: number) => state().edit((s) => setReactor(s, n));
export const setCrewAmount = (race: string, n: number) => state().edit((s) => setCrew(s, race, n));
