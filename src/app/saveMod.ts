/**
 * Saving the open ship as a mod: a `.ftl` file or files in a mod folder.
 */
import {
  buildShipMod,
  buildShipModForFolder,
  joinFolderPath,
  zipMod,
  type FileSource,
  type ModFile,
  type Ship,
  type ShipPictureFiles,
} from "../core";
import { diskFolderSource, folderOf } from "../platform/sources";
import type { Platform } from "../platform/types";
import type { Texts } from "../text";
import { reasonOf } from "./errors";
import type { ShipOrigin } from "./settings";
import { rememberRecent } from "./ships";
import { interiorPath } from "./systems/interiors";
import { readPicture, type PictureRef, type ShipArt } from "./art/model";
import { useEditor, type SaveTarget } from "./store";

/**
 * Reads the bytes of the ship's pictures. `undefined` when there is no hull
 * picture. Gibs are taken up to the first missing one, since gib N must be
 * the N-th picture. Interiors are the pictures the ship's systems name.
 */
export async function readPictureFiles(
  art: ShipArt,
  ship: Ship
): Promise<ShipPictureFiles | undefined> {
  const read = (ref: PictureRef | null | undefined) => readPicture(art.source, ref);
  const hull = await read(art.hull);
  if (!hull) return undefined;
  const files: ShipPictureFiles = { hull, gibs: [], interiors: {} };
  const floor = await read(art.floor);
  const cloak = await read(art.cloak);
  const shield = await read(art.shield);
  const miniship = await read(art.miniship);
  if (floor) files.floor = floor;
  if (cloak) files.cloak = cloak;
  if (shield) files.shield = shield;
  if (miniship) files.miniship = miniship;
  for (const gib of art.gibs.slice(0, ship.layoutXml.gibs.length)) {
    const bytes = await read(gib);
    if (!bytes) break;
    files.gibs.push(bytes);
  }
  for (const name of new Set(ship.blueprint.systems.flatMap((s) => (s.img ? [s.img] : [])))) {
    const bytes = await art.source.readBytes(interiorPath(name));
    if (bytes) files.interiors[name] = bytes;
  }
  return files;
}

/** Writes mod files below a folder, creating sub-folders as needed. */
export async function writeModFiles(
  platform: Platform,
  folder: string,
  files: ModFile[]
): Promise<void> {
  const made = new Set<string>();
  for (const file of files) {
    const full = joinFolderPath(folder, file.path);
    const parent = folderOf(full);
    if (parent && !made.has(parent)) {
      await platform.makeFolder(parent);
      made.add(parent);
    }
    await platform.writeFile(full, file.bytes);
  }
}

export function originOfTarget(target: SaveTarget): ShipOrigin {
  return target.kind === "ftl"
    ? { kind: "modFile", path: target.path }
    : { kind: "modFolder", path: target.path };
}

/** Builds the mod files of the open ship and writes them to the target. */
export async function saveShipMod(
  platform: Platform,
  texts: Texts,
  target: SaveTarget
): Promise<boolean> {
  const store = useEditor.getState();
  const { doc, game } = store;
  if (!doc || !game.data) return false;
  const snapshot = doc.history.present;
  const ship = snapshot.ship;
  try {
    const pictures = await readPictureFiles(snapshot.art, ship);
    if (!pictures) {
      store.setNotice({ kind: "error", text: texts.save.needHull });
      return false;
    }
    const input = {
      ship,
      pictures,
      game: game.data.base as Pick<FileSource, "readBytes">,
      options: { lineEnding: "\r\n" as const },
    };
    if (target.kind === "ftl") {
      await platform.writeFile(target.path, zipMod(await buildShipMod(input)));
    } else {
      const folder = diskFolderSource(platform, target.path);
      await writeModFiles(platform, target.path, await buildShipModForFolder(input, folder));
    }
    const origin = originOfTarget(target);
    const latest = useEditor.getState();
    if (latest.doc?.id === doc.id) latest.markSaved(snapshot, target, origin);
    rememberRecent(ship, origin);
    useEditor.getState().setNotice({ kind: "info", text: texts.save.savedTo(target.path) });
    return true;
  } catch (error) {
    useEditor.getState().setNotice({
      kind: "error",
      text: texts.save.failed(reasonOf(error, texts.errors.unknown)),
    });
    return false;
  }
}
