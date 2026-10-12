/**
 * Access to the vanilla game data for the tests. Set the FTL_DATA_ROOT
 * environment variable to a folder holding the game's unpacked `data/` and
 * `img/`; tests that need it are skipped when it is not set.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findShipBlueprints, type ShipBlueprintLocation } from "../blueprint";

export const GAME_ROOT = process.env.FTL_DATA_ROOT ?? "";
export const DATA_DIR = join(GAME_ROOT, "data");
export const IMG_DIR = join(GAME_ROOT, "img");
export const HAS_GAME_DATA = GAME_ROOT !== "" && existsSync(join(DATA_DIR, "blueprints.xml"));

/** The vanilla files that contain `<shipBlueprint>` elements. */
export const BLUEPRINT_FILES = [
  "blueprints.xml",
  "dlcBlueprints.xml",
  "dlcBlueprintsOverwrite.xml",
  "dlcPirateBlueprints.xml",
  "autoBlueprints.xml",
  "bosses.xml",
];

export interface VanillaBlueprint extends ShipBlueprintLocation {
  file: string;
}

export function readData(name: string): string {
  return readFileSync(join(DATA_DIR, name), "utf8");
}

export function dataExists(name: string): boolean {
  return existsSync(join(DATA_DIR, name));
}

let cache: VanillaBlueprint[] | undefined;

/** Every vanilla ship blueprint, with the file it came from. */
export function vanillaBlueprints(): VanillaBlueprint[] {
  if (!HAS_GAME_DATA) return [];
  cache ??= BLUEPRINT_FILES.flatMap((file) =>
    findShipBlueprints(readData(file)).map((loc) => ({ ...loc, file }))
  );
  return cache;
}

/** Vanilla blueprints whose layout `.txt` and `.xml` both exist. */
export function vanillaShips(): VanillaBlueprint[] {
  return vanillaBlueprints().filter(
    (b) => dataExists(`${b.layout}.txt`) && dataExists(`${b.layout}.xml`)
  );
}

/** Base names of every layout used by a vanilla ship, sorted. */
export function vanillaLayouts(): string[] {
  return [...new Set(vanillaShips().map((b) => b.layout))].sort();
}

/** Finds a ship picture: `img/ship/` first, then the enemy folders. */
export function findShipPicture(fileName: string): string | undefined {
  for (const dir of ["ship", "ships_glow", "ships_noglow"]) {
    const p = join(IMG_DIR, dir, fileName);
    if (existsSync(p)) return p;
  }
  return undefined;
}
