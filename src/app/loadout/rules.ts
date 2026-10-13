/**
 * The ship's starting equipment: weapons and drones in their slots (the n-th
 * weapon is drawn on the n-th mount), augments, starting missiles and drone
 * parts. A list that writes `count` keeps it equal to its number of items.
 */
import { updateBlueprint, type DroneList, type Ship, type WeaponList } from "../../core";

export const LIMITS = {
  weaponSlots: 8,
  droneSlots: 4,
  augments: 3,
} as const;

export type LoadoutKind = "weapon" | "drone";
export type LoadoutProblem = "full" | "duplicate";

export type LoadoutEdit =
  { ship: Ship; problem?: undefined } | { ship?: undefined; problem: LoadoutProblem };

type ItemList = WeaponList | DroneList;

const LIST = { weapon: "weaponList", drone: "droneList" } as const;
const SLOTS = { weapon: "weaponSlots", drone: "droneSlots" } as const;

export function items(ship: Ship, kind: LoadoutKind): string[] {
  return ship.blueprint[LIST[kind]]?.items ?? [];
}

/** The number of slots: the blueprint's value, or the number of items when it has none. */
export function slots(ship: Ship, kind: LoadoutKind): number {
  return ship.blueprint[SLOTS[kind]] ?? items(ship, kind).length;
}

/** The list with new items; `count` follows the items (and is written for a new list). */
function withItems(list: ItemList | undefined, next: string[]): ItemList {
  if (!list) return { count: next.length, items: next };
  const out: ItemList = { ...list, items: next };
  if (list.count !== undefined) out.count = next.length;
  return out;
}

function setItems(ship: Ship, kind: LoadoutKind, next: string[]): Ship {
  return updateBlueprint(ship, { [LIST[kind]]: withItems(ship.blueprint[LIST[kind]], next) });
}

/** Puts an item in the next free slot; refused when every slot is taken. */
export function addItem(ship: Ship, kind: LoadoutKind, name: string): LoadoutEdit {
  const current = items(ship, kind);
  if (current.length >= slots(ship, kind)) return { problem: "full" };
  return { ship: setItems(ship, kind, [...current, name]) };
}

export function removeItems(ship: Ship, kind: LoadoutKind, indices: number[]): Ship {
  if (indices.length === 0) return ship;
  return setItems(
    ship,
    kind,
    items(ship, kind).filter((_, i) => !indices.includes(i))
  );
}

/** Moves an item one slot earlier (-1) or later (+1); for weapons this changes the mount that draws it. */
export function moveItem(ship: Ship, kind: LoadoutKind, index: number, step: -1 | 1): Ship {
  const list = [...items(ship, kind)];
  const other = index + step;
  if (index < 0 || other < 0 || index >= list.length || other >= list.length) return ship;
  [list[index], list[other]] = [list[other], list[index]];
  return setItems(ship, kind, list);
}

/** Sets the number of slots, kept between the items already there and the editor's limit. */
export function setSlots(ship: Ship, kind: LoadoutKind, value: number): Ship {
  const max = kind === "weapon" ? LIMITS.weaponSlots : LIMITS.droneSlots;
  const n = Math.max(items(ship, kind).length, Math.min(max, Math.round(value)));
  return ship.blueprint[SLOTS[kind]] === n ? ship : updateBlueprint(ship, { [SLOTS[kind]]: n });
}

/** Sets the starting missiles (`weaponList missiles`), at least 0. */
export function setMissiles(ship: Ship, value: number): Ship {
  const n = Math.max(0, Math.round(value));
  const list = ship.blueprint.weaponList;
  if (list?.missiles === n) return ship;
  return updateBlueprint(ship, {
    weaponList: { ...withItems(list, list?.items ?? []), missiles: n },
  });
}

/** Sets the starting drone parts (`droneList drones`), at least 0. */
export function setDroneParts(ship: Ship, value: number): Ship {
  const n = Math.max(0, Math.round(value));
  const list = ship.blueprint.droneList;
  if (list?.drones === n) return ship;
  return updateBlueprint(ship, { droneList: { ...withItems(list, list?.items ?? []), drones: n } });
}

/**
 * Adds an augment (at most three). A second copy is refused unless the game
 * says the augment stacks.
 */
export function addAugment(ship: Ship, name: string, stackable = false): LoadoutEdit {
  const augments = ship.blueprint.augments;
  if (augments.length >= LIMITS.augments) return { problem: "full" };
  if (!stackable && augments.includes(name)) return { problem: "duplicate" };
  return { ship: updateBlueprint(ship, { augments: [...augments, name] }) };
}

export function removeAugment(ship: Ship, index: number): Ship {
  if (index < 0 || index >= ship.blueprint.augments.length) return ship;
  return updateBlueprint(ship, { augments: ship.blueprint.augments.filter((_, i) => i !== index) });
}
