/**
 * What the app remembers between runs: the game archive, the mod, the
 * recently used ships, the look of the interface (theme, scale, language) and
 * which inspector sections are folded.
 */
import type { ModRef } from "../platform/types";
import { readStored, writeStored, type KeyValueStore } from "../platform/storage";

const KEYS = {
  datPath: "shipwright.datPath",
  mod: "shipwright.mod",
  recent: "shipwright.recent",
  theme: "shipwright.theme",
  scale: "shipwright.scale",
  language: "shipwright.language",
  sections: "shipwright.sections",
} as const;

export type Theme = "dark" | "light";

/** The interface scales offered, in percent. */
export const UI_SCALES = [90, 100, 110, 125, 150, 175, 200] as const;

export const DEFAULT_UI_SCALE = 100;

export function loadTheme(store?: KeyValueStore): Theme {
  return readStored<unknown>(KEYS.theme, store) === "light" ? "light" : "dark";
}

export function saveTheme(theme: Theme, store?: KeyValueStore): void {
  writeStored(KEYS.theme, theme, store);
}

/** The remembered interface scale in percent, if it is one of the offered ones. */
export function loadUiScale(store?: KeyValueStore): number {
  const value = readStored<unknown>(KEYS.scale, store);
  return UI_SCALES.some((s) => s === value) ? (value as number) : DEFAULT_UI_SCALE;
}

export function saveUiScale(scale: number, store?: KeyValueStore): void {
  writeStored(KEYS.scale, scale, store);
}

export function loadLanguage(store?: KeyValueStore): string | undefined {
  const value = readStored<unknown>(KEYS.language, store);
  return typeof value === "string" ? value : undefined;
}

export function saveLanguage(language: string, store?: KeyValueStore): void {
  writeStored(KEYS.language, language, store);
}

/** Which inspector sections were opened or folded, by section id. */
export function loadOpenSections(store?: KeyValueStore): Record<string, boolean> {
  const value = readStored<unknown>(KEYS.sections, store);
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
    )
  );
}

export function saveSectionOpen(id: string, open: boolean, store?: KeyValueStore): void {
  writeStored(KEYS.sections, { ...loadOpenSections(store), [id]: open }, store);
}

/** How many ships the Recent list keeps. */
export const RECENT_LIMIT = 8;

/** Where a recent ship can be opened from again. */
export type ShipOrigin =
  | { kind: "game"; mod?: ModRef }
  | { kind: "modFile"; path: string }
  | { kind: "modFolder"; path: string };

export interface RecentShip {
  /** The ship's name as the hangar shows it. */
  name: string;
  /** The blueprint name, used to find the ship again. */
  blueprint: string;
  /** The blueprint's picture base name (for the ship icon). */
  img: string;
  origin: ShipOrigin;
  /** When it was last opened or saved (milliseconds since 1970). */
  time: number;
}

export function loadDatPath(store?: KeyValueStore): string | undefined {
  const value = readStored<unknown>(KEYS.datPath, store);
  return typeof value === "string" ? value : undefined;
}

export function saveDatPath(path: string | undefined, store?: KeyValueStore): void {
  writeStored(KEYS.datPath, path, store);
}

export function loadMod(store?: KeyValueStore): ModRef | undefined {
  const value = readStored<ModRef>(KEYS.mod, store);
  if (!value || typeof value.path !== "string") return undefined;
  return value.kind === "folder" || value.kind === "zip" ? value : undefined;
}

export function saveMod(mod: ModRef | undefined, store?: KeyValueStore): void {
  writeStored(KEYS.mod, mod, store);
}

export function loadRecent(store?: KeyValueStore): RecentShip[] {
  const value = readStored<unknown>(KEYS.recent, store);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (r): r is RecentShip =>
      typeof r === "object" &&
      r !== null &&
      typeof r.name === "string" &&
      typeof r.blueprint === "string" &&
      typeof r.origin === "object" &&
      typeof r.time === "number"
  );
}

/** True when two recent entries are the same ship in the same place. */
export function sameRecent(a: RecentShip, b: RecentShip): boolean {
  return a.blueprint === b.blueprint && JSON.stringify(a.origin) === JSON.stringify(b.origin);
}

/** Puts a ship at the top of the list (replacing its older entry) and keeps the list short. */
export function addRecent(list: RecentShip[], entry: RecentShip): RecentShip[] {
  return [entry, ...list.filter((r) => !sameRecent(r, entry))].slice(0, RECENT_LIMIT);
}

export function saveRecent(list: RecentShip[], store?: KeyValueStore): void {
  writeStored(KEYS.recent, list, store);
}
