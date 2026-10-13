/**
 * The game's weapons, drones and augments as the Loadout offers them, with
 * their names resolved through the game's texts.
 */
import {
  EQUIPMENT_DRONE_TYPES,
  resolveText,
  type AugmentCatalogEntry,
  type DroneCatalogEntry,
  type ShipText,
  type WeaponCatalogEntry,
} from "../../core";
import type { GameData } from "../store";

export type ItemKind = "weapon" | "drone" | "augment";

export type CatalogItem =
  | { kind: "weapon"; entry: WeaponCatalogEntry }
  | { kind: "drone"; entry: DroneCatalogEntry }
  | { kind: "augment"; entry: AugmentCatalogEntry };

/** The items offered for a kind; only drones that are equipment. */
export function offeredItems(data: GameData | undefined, kind: ItemKind): CatalogItem[] {
  const catalogs = data?.catalogs;
  if (!catalogs) return [];
  if (kind === "weapon") return catalogs.weapons.map((entry) => ({ kind, entry }));
  if (kind === "augment") return catalogs.augments.map((entry) => ({ kind, entry }));
  const equipment: readonly string[] = EQUIPMENT_DRONE_TYPES;
  return catalogs.drones
    .filter((d) => d.type !== undefined && equipment.includes(d.type))
    .map((entry) => ({ kind, entry }));
}

/** A text of the game, resolved; `undefined` when absent. */
export function gameText(
  data: GameData | undefined,
  text: ShipText | undefined
): string | undefined {
  return data && text ? resolveText(data.texts, text) : undefined;
}

/** An item's title, else its blueprint name. */
export function itemTitle(data: GameData | undefined, item: CatalogItem): string {
  return gameText(data, item.entry.title) || item.entry.name;
}

/** The short name the game's slot bar uses (`short`), else the title. */
export function itemShortName(data: GameData | undefined, item: CatalogItem): string {
  const short = item.kind === "augment" ? undefined : gameText(data, item.entry.short);
  return short || itemTitle(data, item);
}

/** The catalog item of a blueprint name, when the game has it. */
export function findItem(
  data: GameData | undefined,
  kind: ItemKind,
  name: string
): CatalogItem | undefined {
  const catalogs = data?.catalogs;
  if (!catalogs) return undefined;
  if (kind === "weapon") {
    const entry = catalogs.weapons.find((w) => w.name === name);
    return entry && { kind, entry };
  }
  if (kind === "drone") {
    const entry = catalogs.drones.find((d) => d.name === name);
    return entry && { kind, entry };
  }
  const entry = catalogs.augments.find((a) => a.name === name);
  return entry && { kind, entry };
}

/** True when every word of the query is in the item's title or blueprint name. */
export function matchesItem(data: GameData | undefined, item: CatalogItem, query: string): boolean {
  const haystack = `${itemTitle(data, item)} ${item.entry.name}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w !== "")
    .every((word) => haystack.includes(word));
}

/** The pictures a drone may have, in order of preference. */
export function dronePicturePaths(entry: DroneCatalogEntry): string[] {
  if (!entry.droneImage) return [];
  const base = `img/ship/drones/${entry.droneImage}`;
  return [`${base}_base.png`, `${base}_off.png`];
}
