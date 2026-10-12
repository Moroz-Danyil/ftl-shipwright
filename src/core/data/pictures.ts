/**
 * Lists of pictures available in the modded game.
 */
import type { GameView } from "./gameView";

/** Folders holding ship pictures, in lookup order. */
export const SHIP_PICTURE_FOLDERS = ["img/ship", "img/ships_glow", "img/ships_noglow"] as const;

export type ShipPictureKind = "hull" | "floor" | "cloak" | "shield" | "gib";

export interface ShipPicture {
  kind: ShipPictureKind;
  /** The picture base name (the blueprint's `img`, or `floorImage`, ...). */
  base: string;
  path: string;
  /** For gibs: the gib number. */
  gib?: number;
}

export interface NamedPicture {
  /** File name without `.png`. */
  name: string;
  path: string;
}

function fileName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function directlyIn(path: string, folder: string): boolean {
  const p = path.toLowerCase();
  const f = `${folder.toLowerCase()}/`;
  return p.startsWith(f) && !p.slice(f.length).includes("/");
}

function sortByPath<T extends { path: string }>(list: T[]): T[] {
  return list.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Room interiors in `img/ship/interior/`, without the lighting overlays (names containing `glow`). */
export async function listInteriors(view: GameView): Promise<NamedPicture[]> {
  const out: NamedPicture[] = [];
  for (const path of await view.list()) {
    if (!directlyIn(path, "img/ship/interior") || !/\.png$/i.test(path)) continue;
    const name = fileName(path).replace(/\.png$/i, "");
    if (/glow/i.test(name)) continue;
    out.push({ name, path });
  }
  return sortByPath(out);
}

const SHIP_PICTURE = /^(.+)_(base|floor|cloak|shields1|gib(\d+))\.png$/i;

/** Ship pictures in `img/ship/`, `img/ships_glow/`, `img/ships_noglow/`, grouped by kind. */
export async function listShipPictures(
  view: GameView
): Promise<Record<ShipPictureKind, ShipPicture[]>> {
  const out: Record<ShipPictureKind, ShipPicture[]> = {
    hull: [],
    floor: [],
    cloak: [],
    shield: [],
    gib: [],
  };
  for (const path of await view.list()) {
    if (!SHIP_PICTURE_FOLDERS.some((f) => directlyIn(path, f))) continue;
    const m = SHIP_PICTURE.exec(fileName(path));
    if (!m) continue;
    const suffix = m[2].toLowerCase();
    if (m[3] !== undefined) out.gib.push({ kind: "gib", base: m[1], path, gib: Number(m[3]) });
    else {
      const kind: ShipPictureKind =
        suffix === "base" ? "hull" : suffix === "shields1" ? "shield" : (suffix as ShipPictureKind);
      out[kind].push({ kind, base: m[1], path });
    }
  }
  for (const list of Object.values(out)) sortByPath(list);
  return out;
}

/** Ship select icons `img/customizeUI/miniship_<img>.png`; `name` is the `<img>` part. */
export async function listMiniships(view: GameView): Promise<NamedPicture[]> {
  const out: NamedPicture[] = [];
  for (const path of await view.list()) {
    if (!directlyIn(path, "img/customizeUI")) continue;
    const m = /^miniship_(.+)\.png$/i.exec(fileName(path));
    if (m) out.push({ name: m[1], path });
  }
  return sortByPath(out);
}

/** The first existing path of `<folder>/<file>` over the ship picture folders. */
export async function findShipPicturePath(
  view: GameView,
  file: string
): Promise<string | undefined> {
  for (const folder of SHIP_PICTURE_FOLDERS) {
    const p = `${folder}/${file}`;
    if (await view.has(p)) return p;
  }
  return undefined;
}
