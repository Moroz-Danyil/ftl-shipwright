/**
 * The game's ships as the pickers list them: player ships first, filtered by
 * a search text.
 */
import type { ShipCatalogEntry } from "../core";

export interface ShipGroups {
  player: ShipCatalogEntry[];
  other: ShipCatalogEntry[];
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

/** The ships matching the query, split into player ships and the others, each in game order. */
export function groupShips(ships: ShipCatalogEntry[], query = ""): ShipGroups {
  const matching = ships.filter((s) => matchesShip(s, query));
  return {
    player: matching.filter((s) => s.isPlayer),
    other: matching.filter((s) => !s.isPlayer),
  };
}
