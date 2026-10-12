/**
 * Catalogs of ships and items in the modded game (for pickers and cards).
 */
import type { ShipText } from "../model";
import { elements, firstElement } from "../xml";
import type { GameView } from "./gameView";
import { resolveText, type GameTexts } from "./texts";
import {
  childNumber,
  childText,
  readGameText,
  readTopLevelElements,
  type LayeredElement,
} from "./xmlLayers";

/** The blueprint files, in the order the game reads them. */
export const BLUEPRINT_FILES = [
  "data/blueprints.xml",
  "data/dlcBlueprints.xml",
  "data/dlcBlueprintsOverwrite.xml",
  "data/dlcPirateBlueprints.xml",
  "data/autoBlueprints.xml",
  "data/bosses.xml",
] as const;

/** Where a definition comes from. */
export interface Origin {
  /** The game file (e.g. `data/blueprints.xml`). */
  file: string;
  /** True when the definition comes from the mod. */
  fromMod: boolean;
}

export interface ShipCatalogEntry extends Origin {
  name: string;
  layout: string;
  img: string;
  /** Name starts with `PLAYER_SHIP_`. */
  isPlayer: boolean;
  /** The `name` text resolved, else the blueprint name. */
  displayName: string;
  /** The `class` text resolved, if any. */
  className?: string;
  nameText?: ShipText;
  classText?: ShipText;
  /** The `<shipBlueprint>` element's source text. */
  xml: string;
}

export interface WeaponCatalogEntry extends Origin {
  name: string;
  /** `LASER`, `BURST`, `BEAM`, `MISSILES`, `BOMB`. */
  type?: string;
  title?: ShipText;
  short?: ShipText;
  desc?: ShipText;
  tooltip?: ShipText;
  damage?: number;
  shots?: number;
  /** Shield piercing. */
  sp?: number;
  /** 0-10, shown as tens of percent. */
  fireChance?: number;
  breachChance?: number;
  stunChance?: number;
  ion?: number;
  persDamage?: number;
  sysDamage?: number;
  cooldown?: number;
  power?: number;
  missiles?: number;
  cost?: number;
  /** Name of the `weaponAnim` that draws it. */
  weaponArt?: string;
  iconImage?: string;
}

export interface DroneCatalogEntry extends Origin {
  name: string;
  type?: string;
  title?: ShipText;
  short?: ShipText;
  desc?: ShipText;
  power?: number;
  cost?: number;
  droneImage?: string;
  iconImage?: string;
}

export interface AugmentCatalogEntry extends Origin {
  name: string;
  title?: ShipText;
  desc?: ShipText;
  cost?: number;
  stackable?: boolean;
  value?: number;
}

export interface RaceCatalogEntry extends Origin {
  /** The race name (`human`, `engi`, ...). */
  name: string;
  title?: ShipText;
  short?: ShipText;
  desc?: ShipText;
  cost?: number;
  /** `powerList/power`: texts describing the race's traits. */
  powers: ShipText[];
}

export interface SystemCatalogEntry extends Origin {
  name: string;
  type?: string;
  title?: ShipText;
  desc?: ShipText;
  startPower?: number;
  maxPower?: number;
  cost?: number;
}

export interface Catalogs {
  /** Usable ships: both layout files exist. */
  ships: ShipCatalogEntry[];
  weapons: WeaponCatalogEntry[];
  drones: DroneCatalogEntry[];
  augments: AugmentCatalogEntry[];
  races: RaceCatalogEntry[];
  systems: SystemCatalogEntry[];
}

/** Drone `type` values that are equipment (the others, e.g. `ITEM_*`, are store items). */
export const EQUIPMENT_DRONE_TYPES = [
  "COMBAT",
  "DEFENSE",
  "SHIELD",
  "BOARDER",
  "REPAIR",
  "SHIP_REPAIR",
  "HACKING",
  "BATTLE",
] as const;

/**
 * Every top-level element of the blueprint files, in reading order (the files
 * in {@link BLUEPRINT_FILES} order, each followed by its appends).
 */
export async function readBlueprintElements(view: GameView): Promise<LayeredElement[]> {
  const out: LayeredElement[] = [];
  for (const file of BLUEPRINT_FILES) out.push(...(await readTopLevelElements(view, file)));
  return out;
}

/**
 * The definitions of one element kind, by `name` attribute. A name defined
 * again replaces the earlier definition (which keeps its place in the order).
 */
export function latestDefinitions(all: LayeredElement[], elementName: string): LayeredElement[] {
  const byName = new Map<string, LayeredElement>();
  for (const item of all) {
    if (item.element.name !== elementName) continue;
    const name = item.element.attributes.name;
    if (name === undefined) continue;
    byName.set(name, item);
  }
  return [...byName.values()];
}

function origin(item: LayeredElement): Origin {
  return { file: item.file, fromMod: item.fromMod };
}

/** Copies only the defined values, so absent fields stay absent. */
function defined<T extends object>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj))
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

/**
 * Builds every catalog from the modded game. With `texts`, ship display
 * names and classes are resolved; without, the display name is the
 * blueprint name.
 */
export async function loadCatalogs(view: GameView, texts?: GameTexts): Promise<Catalogs> {
  const all = await readBlueprintElements(view);
  const files = new Set((await view.list()).map((p) => p.toLowerCase()));
  const exists = (p: string) => files.has(p.toLowerCase());

  const ships: ShipCatalogEntry[] = [];
  for (const item of latestDefinitions(all, "shipBlueprint")) {
    const el = item.element;
    const name = el.attributes.name!;
    const layout = el.attributes.layout ?? "";
    const img = el.attributes.img ?? "";
    if (!layout || !exists(`data/${layout}.txt`) || !exists(`data/${layout}.xml`)) continue;
    const nameText = readGameText(firstElement(el.children, "name"));
    const classText = readGameText(firstElement(el.children, "class"));
    const resolvedName = texts ? resolveText(texts, nameText) : undefined;
    const resolvedClass = texts ? resolveText(texts, classText) : undefined;
    ships.push(
      defined({
        name,
        layout,
        img,
        isPlayer: name.startsWith("PLAYER_SHIP_"),
        displayName: resolvedName || name,
        className: resolvedClass,
        nameText,
        classText,
        xml: item.source.slice(el.start, el.end),
        ...origin(item),
      })
    );
  }

  const text = (item: LayeredElement, name: string) =>
    readGameText(firstElement(item.element.children, name));
  const num = (item: LayeredElement, name: string) => childNumber(item.element, name);
  const str = (item: LayeredElement, name: string) => childText(item.element, name);

  const weapons = latestDefinitions(all, "weaponBlueprint").map((w) =>
    defined<WeaponCatalogEntry>({
      name: w.element.attributes.name!,
      type: str(w, "type"),
      title: text(w, "title"),
      short: text(w, "short"),
      desc: text(w, "desc"),
      tooltip: text(w, "tooltip"),
      damage: num(w, "damage"),
      shots: num(w, "shots"),
      sp: num(w, "sp"),
      fireChance: num(w, "fireChance"),
      breachChance: num(w, "breachChance"),
      stunChance: num(w, "stunChance"),
      ion: num(w, "ion"),
      persDamage: num(w, "persDamage"),
      sysDamage: num(w, "sysDamage"),
      cooldown: num(w, "cooldown"),
      power: num(w, "power"),
      missiles: num(w, "missiles"),
      cost: num(w, "cost"),
      weaponArt: str(w, "weaponArt"),
      iconImage: str(w, "iconImage"),
      ...origin(w),
    })
  );

  const drones = latestDefinitions(all, "droneBlueprint").map((d) =>
    defined<DroneCatalogEntry>({
      name: d.element.attributes.name!,
      type: str(d, "type"),
      title: text(d, "title"),
      short: text(d, "short"),
      desc: text(d, "desc"),
      power: num(d, "power"),
      cost: num(d, "cost"),
      droneImage: str(d, "droneImage"),
      iconImage: str(d, "iconImage"),
      ...origin(d),
    })
  );

  const augments = latestDefinitions(all, "augBlueprint").map((a) => {
    const stackable = str(a, "stackable");
    return defined<AugmentCatalogEntry>({
      name: a.element.attributes.name!,
      title: text(a, "title"),
      desc: text(a, "desc"),
      cost: num(a, "cost"),
      stackable: stackable === undefined ? undefined : stackable.toLowerCase() === "true",
      value: num(a, "value"),
      ...origin(a),
    });
  });

  const races = latestDefinitions(all, "crewBlueprint").map((c) => {
    const powerList = firstElement(c.element.children, "powerList");
    return defined<RaceCatalogEntry>({
      name: c.element.attributes.name!,
      title: text(c, "title"),
      short: text(c, "short"),
      desc: text(c, "desc"),
      cost: num(c, "cost"),
      powers: powerList ? elements(powerList.children, "power").map((p) => readGameText(p)!) : [],
      ...origin(c),
    });
  });

  const systems = latestDefinitions(all, "systemBlueprint").map((s) =>
    defined<SystemCatalogEntry>({
      name: s.element.attributes.name!,
      type: str(s, "type"),
      title: text(s, "title"),
      desc: text(s, "desc"),
      startPower: num(s, "startPower"),
      maxPower: num(s, "maxPower"),
      cost: num(s, "cost"),
      ...origin(s),
    })
  );

  return { ships, weapons, drones, augments, races, systems };
}
