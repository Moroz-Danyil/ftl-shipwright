/**
 * Loading a ship from the modded game by its blueprint name.
 */
import type { Ship } from "../model";
import { loadShip } from "../ship";
import { latestDefinitions, readBlueprintElements } from "./catalogs";
import type { GameView } from "./gameView";
import { findShipPicturePath } from "./pictures";

/** Paths (in the game tree) of the pictures a ship uses that exist; missing ones are absent / `null`. */
export interface ShipPicturePaths {
  hull?: string;
  floor?: string;
  cloak?: string;
  shield?: string;
  miniship?: string;
  /** One entry per gib in the layout `.xml` (gib N at index N-1); `null` when the picture is missing. */
  gibs: Array<string | null>;
  /** Interior pictures by name (a system's `img`), for those that exist. */
  interiors: Record<string, string>;
}

export interface LoadedShip {
  ship: Ship;
  pictures: ShipPicturePaths;
  /** The file the blueprint was defined in. */
  file: string;
  /** True when the blueprint comes from the mod. */
  blueprintFromMod: boolean;
  /** True when the mod replaces the layout `.txt` / `.xml`. */
  layoutFromMod: boolean;
  layoutXmlFromMod: boolean;
}

/**
 * Loads the ship whose blueprint has this name (the later definition wins),
 * with its layout files, through the core's `loadShip`. Returns `undefined`
 * when there is no such blueprint or a layout file is missing. Throws the
 * core's `ShipFormatError` if the blueprint or layout `.xml` cannot be read.
 */
export async function loadShipFromGame(
  view: GameView,
  name: string
): Promise<LoadedShip | undefined> {
  const def = latestDefinitions(await readBlueprintElements(view), "shipBlueprint").find(
    (d) => d.element.attributes.name === name
  );
  if (!def) return undefined;
  const layout = def.element.attributes.layout ?? "";
  const txtPath = `data/${layout}.txt`;
  const xmlPath = `data/${layout}.xml`;
  const [layoutTxt, layoutXml] = await Promise.all([
    view.readText(txtPath),
    view.readText(xmlPath),
  ]);
  if (layoutTxt === undefined || layoutXml === undefined) return undefined;
  const ship = loadShip({
    blueprintXml: def.source.slice(def.element.start, def.element.end),
    layoutTxt,
    layoutXml,
  });
  return {
    ship,
    pictures: await findShipPictures(view, ship),
    file: def.file,
    blueprintFromMod: def.fromMod,
    layoutFromMod: await view.isFromMod(txtPath),
    layoutXmlFromMod: await view.isFromMod(xmlPath),
  };
}

/** Looks up which of a ship's pictures exist in the game (see {@link ShipPicturePaths}). */
export async function findShipPictures(view: GameView, ship: Ship): Promise<ShipPicturePaths> {
  const bp = ship.blueprint;
  const out: ShipPicturePaths = { gibs: [], interiors: {} };
  const set = async (key: "hull" | "floor" | "cloak" | "shield", file: string) => {
    const p = await findShipPicturePath(view, file);
    if (p) out[key] = p;
  };
  await set("hull", `${bp.img}_base.png`);
  await set("floor", `${bp.floorImage ?? bp.img}_floor.png`);
  await set("cloak", `${bp.cloakImage ?? bp.img}_cloak.png`);
  await set("shield", `${bp.shieldImage ?? bp.img}_shields1.png`);
  const mini = `img/customizeUI/miniship_${bp.img}.png`;
  if (await view.has(mini)) out.miniship = mini;
  for (let i = 1; i <= ship.layoutXml.gibs.length; i++) {
    out.gibs.push((await findShipPicturePath(view, `${bp.img}_gib${i}.png`)) ?? null);
  }
  for (const s of bp.systems) {
    if (s.img === undefined || s.img in out.interiors) continue;
    const p = `img/ship/interior/${s.img}.png`;
    if (await view.has(p)) out.interiors[s.img] = p;
  }
  return out;
}
