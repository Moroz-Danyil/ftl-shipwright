/**
 * The game's ships as the pickers list them: player ships first, then the
 * other ships grouped by their class (all "Rebel Flagship" variants
 * together, the classes in alphabetical order), filtered by a search text.
 */
import type { ShipCatalogEntry } from "../core";

/** Ships of one class, in game order; `className` is absent for the ships without a class. */
export interface ShipClassGroup {
  className?: string;
  ships: ShipCatalogEntry[];
}

export interface ShipGroups {
  player: ShipCatalogEntry[];
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

/** The ships matching the query: the player ships in game order, the others by class. */
export function groupShips(ships: ShipCatalogEntry[], query = ""): ShipGroups {
  const matching = ships.filter((s) => matchesShip(s, query));
  return {
    player: matching.filter((s) => s.isPlayer),
    other: groupByClass(matching.filter((s) => !s.isPlayer)),
  };
}
