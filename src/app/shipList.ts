/**
 * The game's ships as the pickers list them: the player ships first, as the
 * hangar orders them (by ship type, each type's layouts A, B and C), then the
 * player ships in no hangar slot, then the other ships grouped by their class
 * (all "Rebel Flagship" variants together, the classes in alphabetical
 * order), filtered by a search text.
 */
import type { ShipCatalogEntry } from "../core";
import { HANGAR_TYPES, slotOf, type HangarTypeId } from "./hangar";

/** Ships of one class, in game order; `className` is absent for the ships without a class. */
export interface ShipClassGroup {
  className?: string;
  ships: ShipCatalogEntry[];
}

/** A player ship in a hangar slot, with its layout (0 = A, 1 = B, 2 = C). */
export interface SlotShip {
  ship: ShipCatalogEntry;
  layout: number;
}

/** The player ships of one hangar ship type, in the order of their layouts. */
export interface HangarTypeGroup {
  type: HangarTypeId;
  ships: SlotShip[];
}

export interface ShipGroups {
  /** The player ships in hangar slots, by ship type in the hangar's order; types without ships left out. */
  hangar: HangarTypeGroup[];
  /** The player ships whose name is no hangar slot (the easy and tutorial ships, mod ships), in game order. */
  otherPlayer: ShipCatalogEntry[];
  /** The other ships by class, the classes in alphabetical order; the ones without a class last. */
  other: ShipClassGroup[];
}

/** True when every word of the query is in the ship's name, class or blueprint name. */
export function matchesShip(ship: ShipCatalogEntry, query: string): boolean {
  const haystack = [ship.displayName, ship.className ?? "", ship.name].join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w !== "")
    .every((word) => haystack.includes(word));
}

/** True when the game's texts give the ship a name of its own (most enemy ships have only a class). */
function hasOwnName(ship: ShipCatalogEntry): boolean {
  return ship.displayName !== ship.name;
}

/**
 * The title a list shows for a ship: the game's name for it, else its class,
 * else its blueprint name.
 */
export function shipTitle(ship: ShipCatalogEntry): string {
  return hasOwnName(ship) ? ship.displayName : ship.className || ship.name;
}

/** True for a ship the player can fly: a player ship, or any ship under a hangar slot's name. */
function isPlayerShip(ship: ShipCatalogEntry): boolean {
  return ship.isPlayer || slotOf(ship.name) !== undefined;
}

/**
 * The player ships in hangar slots by ship type, in the hangar's order, each
 * type's ships by layout (ships of one layout in game order).
 */
export function groupBySlot(ships: ShipCatalogEntry[]): HangarTypeGroup[] {
  const bySlot = ships.flatMap((ship) => {
    const slot = slotOf(ship.name);
    return slot ? [{ ship, ...slot }] : [];
  });
  return HANGAR_TYPES.map(({ id }) => ({
    type: id,
    ships: bySlot
      .filter((s) => s.type === id)
      .sort((a, b) => a.layout - b.layout)
      .map(({ ship, layout }) => ({ ship, layout })),
  })).filter((group) => group.ships.length > 0);
}

/**
 * The ships by class, the classes in alphabetical order (so the classes of one
 * race, such as "Mantis Bomber" and "Mantis Fighter", follow each other) and
 * the ships of a class in game order; the ships without a class last.
 */
export function groupByClass(ships: ShipCatalogEntry[]): ShipClassGroup[] {
  const byClass = new Map<string, ShipCatalogEntry[]>();
  const without: ShipCatalogEntry[] = [];
  for (const ship of ships) {
    if (!ship.className) without.push(ship);
    else byClass.set(ship.className, [...(byClass.get(ship.className) ?? []), ship]);
  }
  const groups: ShipClassGroup[] = [...byClass]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([className, list]) => ({ className, ships: list }));
  return without.length > 0 ? [...groups, { ships: without }] : groups;
}

/**
 * The ships matching the query: the player ships in the hangar's order, the
 * other player ships, then the others by class.
 */
export function groupShips(ships: ShipCatalogEntry[], query = ""): ShipGroups {
  const matching = ships.filter((s) => matchesShip(s, query));
  const player = matching.filter(isPlayerShip);
  return {
    hangar: groupBySlot(player),
    otherPlayer: player.filter((s) => slotOf(s.name) === undefined),
    other: groupByClass(matching.filter((s) => !isPlayerShip(s))),
  };
}
