/**
 * Opening ships: from the game, as a new ship (empty or a copy) and from the
 * Recent list.
 */
import {
  createGameView,
  createShip,
  loadShipFromGame,
  resolveText,
  type GameView,
  type Ship,
  type ShipCatalogEntry,
} from "../core";
import { modSource } from "../platform/sources";
import type { Platform } from "../platform/types";
import type { Texts } from "../text";
import { artFromPaths } from "./art/model";
import { reasonOf } from "./errors";
import { addRecent, saveRecent, type RecentShip, type ShipOrigin } from "./settings";
import { useEditor, type GameData, type SaveTarget } from "./store";

/** The ship's name as the hangar shows it: its `name` text, else the blueprint name. */
export function shipDisplayName(ship: Ship, data?: GameData): string {
  const text = ship.blueprint.texts.name;
  if (text?.kind === "text") return text.text || ship.blueprint.name;
  return (data && resolveText(data.texts, text)) || ship.blueprint.name;
}

/** Remembers a ship in the Recent list. */
export function rememberRecent(ship: Ship, origin: ShipOrigin): void {
  const state = useEditor.getState();
  const entry: RecentShip = {
    name: shipDisplayName(ship, state.game.data),
    blueprint: ship.blueprint.name,
    img: ship.blueprint.img,
    origin,
    time: Date.now(),
  };
  const recent = addRecent(state.recent, entry);
  state.setRecent(recent);
  saveRecent(recent);
}

function requireGame(): GameData {
  const data = useEditor.getState().game.data;
  if (!data) throw new Error("The game data is not loaded");
  return data;
}

async function loadFrom(view: GameView, name: string, texts: Texts) {
  const loaded = await loadShipFromGame(view, name);
  if (!loaded) throw new Error(texts.errors.shipNotFound);
  return loaded;
}

/** Opens a ship of the game (with the mod) for editing in place. */
export async function openGameShip(texts: Texts, name: string): Promise<boolean> {
  const store = useEditor.getState();
  try {
    const data = requireGame();
    const loaded = await loadFrom(data.view, name, texts);
    const origin: ShipOrigin = data.mod ? { kind: "game", mod: data.mod } : { kind: "game" };
    store.openDocument({
      ship: loaded.ship,
      art: artFromPaths(data.view, loaded.pictures),
      origin,
      saved: true,
    });
    rememberRecent(loaded.ship, origin);
    store.setNotice(undefined);
    return true;
  } catch (error) {
    store.setNotice({
      kind: "error",
      text: texts.openShip.failed(name, reasonOf(error, texts.errors.unknown)),
    });
    return false;
  }
}

/** A file-name-safe lower-case id from a ship name. */
export function slugFromName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32)
    .replace(/_+$/, "");
  return slug || "ship";
}

/**
 * The ids of a new ship: a blueprint name and a layout/picture base name that
 * no ship of the game uses yet.
 */
export function newShipIds(
  name: string,
  ships: Pick<ShipCatalogEntry, "name" | "layout" | "img">[]
): { name: string; layout: string; img: string } {
  const taken = new Set<string>();
  for (const s of ships) {
    taken.add(s.name.toLowerCase());
    taken.add(s.layout.toLowerCase());
    taken.add(s.img.toLowerCase());
  }
  const base = slugFromName(name);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}_${n}`;
  return { name: slug.toUpperCase(), layout: slug, img: slug };
}

/** Creates a new ship, empty or as a copy of a game ship, under its own name and ids. */
export async function createNewShip(
  texts: Texts,
  input: { name: string; copyOf?: string }
): Promise<boolean> {
  const store = useEditor.getState();
  try {
    const data = requireGame();
    const ids = newShipIds(input.name, data.catalogs.ships);
    const nameText = { kind: "text" as const, text: input.name };
    if (input.copyOf) {
      const loaded = await loadFrom(data.view, input.copyOf, texts);
      const original = loaded.ship;
      const ship: Ship = {
        ...original,
        blueprint: {
          ...original.blueprint,
          ...ids,
          texts: { ...original.blueprint.texts, name: nameText },
        },
      };
      store.openDocument({
        ship,
        art: artFromPaths(data.view, loaded.pictures),
        saved: false,
      });
    } else {
      const empty = createShip(ids);
      const ship: Ship = {
        ...empty,
        blueprint: { ...empty.blueprint, texts: { name: nameText }, health: 30 },
      };
      store.openDocument({
        ship,
        art: { source: data.view, gibs: [] },
        saved: false,
      });
    }
    store.setNotice(undefined);
    return true;
  } catch (error) {
    store.setNotice({
      kind: "error",
      text: texts.openShip.failed(
        input.copyOf ?? input.name,
        reasonOf(error, texts.errors.unknown)
      ),
    });
    return false;
  }
}

/** Opens a ship from the Recent list: from the game, or from the mod it was saved as. */
export async function openRecentShip(
  platform: Platform,
  texts: Texts,
  entry: RecentShip
): Promise<boolean> {
  const store = useEditor.getState();
  try {
    const data = requireGame();
    const origin = entry.origin;
    if (origin.kind === "game") return await openGameShip(texts, entry.blueprint);
    const mod = await modSource(platform, {
      kind: origin.kind === "modFile" ? "zip" : "folder",
      path: origin.path,
    });
    const view = createGameView(data.base, mod);
    const loaded = await loadFrom(view, entry.blueprint, texts);
    const saveTarget: SaveTarget =
      origin.kind === "modFile"
        ? { kind: "ftl", path: origin.path }
        : { kind: "folder", path: origin.path };
    store.openDocument({
      ship: loaded.ship,
      art: artFromPaths(view, loaded.pictures),
      origin,
      saveTarget,
      saved: true,
    });
    rememberRecent(loaded.ship, origin);
    store.setNotice(undefined);
    return true;
  } catch (error) {
    store.setNotice({
      kind: "error",
      text: texts.start.recentFailed(entry.name, reasonOf(error, texts.errors.unknown)),
    });
    return false;
  }
}
