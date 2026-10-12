/**
 * Writing a ship as a Slipstream mod: the list of files, merging into an
 * existing `data/blueprints.xml.append`, and `.ftl` (zip) bytes.
 */
import { zipSync } from "fflate";
import { findShipBlueprints, replaceShipBlueprint, writeShipBlueprint } from "../blueprint";
import { writeLayoutTxt } from "../layoutTxt";
import { writeLayoutXml } from "../layoutXml";
import type { Ship } from "../model";
import type { WriteOptions } from "../options";
import { encodeText, normalizePath, type FileSource } from "../data/sources";
import { elements, parseXml } from "../xml";

/** One file of a mod. */
export interface ModFile {
  /** Path inside the mod, forward slashes (e.g. `data/kestral.txt`). */
  path: string;
  bytes: Uint8Array;
}

/** The pictures of a ship, as PNG bytes. */
export interface ShipPictureFiles {
  hull: Uint8Array;
  floor?: Uint8Array;
  cloak?: Uint8Array;
  shield?: Uint8Array;
  miniship?: Uint8Array;
  /** Gib N at index N-1. */
  gibs: Uint8Array[];
  /** Interior pictures by name (a system's `img`). */
  interiors: Record<string, Uint8Array>;
}

/** Path of the append file that holds the mod's blueprints. */
export const BLUEPRINT_APPEND_PATH = "data/blueprints.xml.append";

export interface BuildShipModInput {
  ship: Ship;
  pictures: ShipPictureFiles;
  /**
   * The base game (no mod). Pictures whose bytes equal the game's file at
   * the same path are left out.
   */
  game?: Pick<FileSource, "readBytes">;
  /**
   * The current text of the mod's `data/blueprints.xml.append`, when saving
   * into a mod that already has one; the ship's blueprint is merged into it
   * with {@link mergeBlueprintAppend}.
   */
  existingAppend?: string;
  /** Formatting of the written text files. */
  options?: WriteOptions;
}

/**
 * The picture paths of a ship in a mod. The floor, cloak and shield use the
 * blueprint's `floorImage` / `cloakImage` / `shieldImage` when set (that is
 * the name the game looks for), else its `img`.
 */
export function shipPicturePaths(ship: Ship): {
  hull: string;
  floor: string;
  cloak: string;
  shield: string;
  miniship: string;
  gib: (n: number) => string;
  interior: (name: string) => string;
} {
  const bp = ship.blueprint;
  return {
    hull: `img/ship/${bp.img}_base.png`,
    floor: `img/ship/${bp.floorImage ?? bp.img}_floor.png`,
    cloak: `img/ship/${bp.cloakImage ?? bp.img}_cloak.png`,
    shield: `img/ship/${bp.shieldImage ?? bp.img}_shields1.png`,
    miniship: `img/customizeUI/miniship_${bp.img}.png`,
    gib: (n) => `img/ship/${bp.img}_gib${n}.png`,
    interior: (name) => `img/ship/interior/${name}.png`,
  };
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * The files of a mod that adds (or replaces) one ship:
 * `data/blueprints.xml.append`, `data/<layout>.txt`, `data/<layout>.xml` and
 * the pictures, minus pictures identical to the game's own.
 */
export async function buildShipMod(input: BuildShipModInput): Promise<ModFile[]> {
  const { ship, pictures, game, options } = input;
  const lineEnding = options?.lineEnding ?? "\n";
  const blueprintXml = writeShipBlueprint(ship.blueprint, options);
  const appendText =
    input.existingAppend !== undefined
      ? mergeBlueprintAppend(input.existingAppend, blueprintXml)
      : blueprintXml;
  const layout = ship.blueprint.layout;
  const files: ModFile[] = [
    { path: BLUEPRINT_APPEND_PATH, bytes: encodeText(appendText) },
    { path: `data/${layout}.txt`, bytes: encodeText(writeLayoutTxt(ship.layout, { lineEnding })) },
    { path: `data/${layout}.xml`, bytes: encodeText(writeLayoutXml(ship.layoutXml, options)) },
  ];

  const paths = shipPicturePaths(ship);
  const candidates: ModFile[] = [{ path: paths.hull, bytes: pictures.hull }];
  if (pictures.floor) candidates.push({ path: paths.floor, bytes: pictures.floor });
  if (pictures.cloak) candidates.push({ path: paths.cloak, bytes: pictures.cloak });
  pictures.gibs.forEach((bytes, i) => candidates.push({ path: paths.gib(i + 1), bytes }));
  if (pictures.shield) candidates.push({ path: paths.shield, bytes: pictures.shield });
  if (pictures.miniship) candidates.push({ path: paths.miniship, bytes: pictures.miniship });
  for (const [name, bytes] of Object.entries(pictures.interiors))
    candidates.push({ path: paths.interior(name), bytes });

  for (const file of candidates) {
    const own = game ? await game.readBytes(file.path) : undefined;
    if (own && sameBytes(own, file.bytes)) continue;
    files.push(file);
  }
  return files;
}

/**
 * Puts a `<shipBlueprint>` into the text of an existing append file. A
 * blueprint with the same name is replaced in place (the last one, if there
 * are several); otherwise the new one is added at the end (inside the closing
 * `</FTL>` when the file is wrapped in one). Everything else is kept byte for
 * byte. Blueprints inside Slipstream `mod:` instructions are not matched.
 */
export function mergeBlueprintAppend(existing: string, blueprintXml: string): string {
  const name = findShipBlueprints(blueprintXml)[0]?.name;
  const element = blueprintXml.replace(/\s+$/, "");
  const lineEnding = existing.includes("\r\n") ? "\r\n" : "\n";
  const same = findShipBlueprints(existing).filter((b) => b.name === name);
  if (name !== undefined && same.length > 0) {
    return replaceShipBlueprint(existing, same[same.length - 1], element);
  }
  const top = elements(parseXml(existing));
  const last = top[top.length - 1];
  if (last && last.name === "FTL") {
    const close = existing.lastIndexOf("</", last.end);
    if (close > last.start && /^<\/\s*FTL\s*>$/.test(existing.slice(close, last.end))) {
      const before = existing.slice(0, close);
      const sep = before.endsWith("\n") ? "" : lineEnding;
      return `${before}${sep}${element}${lineEnding}${existing.slice(close)}`;
    }
  }
  if (existing.length === 0) return `${element}${lineEnding}`;
  const sep = existing.endsWith("\n") ? "" : lineEnding;
  return `${existing}${sep}${element}${lineEnding}`;
}

/** Zips mod files into `.ftl` bytes (the tree at the root, no wrapping folder). A later file with the same path wins. */
export function zipMod(files: ModFile[]): Uint8Array {
  const tree: Record<string, Uint8Array> = {};
  for (const f of files) tree[normalizePath(f.path)] = f.bytes;
  return zipSync(tree, { level: 6 });
}

/**
 * The files to write when saving into a mod folder: like {@link buildShipMod},
 * with the folder's current `data/blueprints.xml.append` (if any) merged.
 */
export async function buildShipModForFolder(
  input: Omit<BuildShipModInput, "existingAppend">,
  folder: Pick<FileSource, "readText">
): Promise<ModFile[]> {
  const existingAppend = await folder.readText(BLUEPRINT_APPEND_PATH);
  return buildShipMod({ ...input, existingAppend });
}
