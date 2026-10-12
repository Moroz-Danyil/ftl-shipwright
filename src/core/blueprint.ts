/**
 * Reader and writer for one `<shipBlueprint>` element, and a finder for all
 * ship blueprints in a blueprints file.
 */
import { ShipFormatError } from "./errors";
import type {
  CrewCount,
  DroneList,
  ExtraAttributes,
  ShipBlueprint,
  ShipSystem,
  ShipText,
  ShipTexts,
  StationSlot,
  WeaponList,
} from "./model";
import { resolveWriteOptions, type WriteOptions } from "./options";
import {
  elements,
  findElementsDeep,
  firstElement,
  parseXml,
  textOf,
  XmlWriter,
  type XmlElement,
} from "./xml";

/** Where a `<shipBlueprint>` sits in a blueprints file. */
export interface ShipBlueprintLocation {
  /** `name` attribute ('' when missing). */
  name: string;
  /** `layout` attribute ('' when missing). */
  layout: string;
  /** `img` attribute ('' when missing). */
  img: string;
  /** Offset of the element's `<`. */
  start: number;
  /** Offset just past the element's end. */
  end: number;
  /** The element's source text, `text.slice(start, end)`. */
  xml: string;
}

/**
 * Finds every `<shipBlueprint>` element in a blueprints file (at any depth).
 * Commented-out blueprints are skipped. The file may have no root element,
 * several top-level elements, comments and any whitespace.
 */
export function findShipBlueprints(fileText: string): ShipBlueprintLocation[] {
  return findElementsDeep(parseXml(fileText), "shipBlueprint").map((el) => ({
    name: el.attributes.name ?? "",
    layout: el.attributes.layout ?? "",
    img: el.attributes.img ?? "",
    start: el.start,
    end: el.end,
    xml: fileText.slice(el.start, el.end),
  }));
}

/**
 * Returns `fileText` with the blueprint at `location` replaced by `newXml`
 * (e.g. the output of {@link writeShipBlueprint} with its trailing line
 * ending removed). `location` must come from {@link findShipBlueprints} on
 * the same text.
 */
export function replaceShipBlueprint(
  fileText: string,
  location: ShipBlueprintLocation,
  newXml: string
): string {
  if (fileText.slice(location.start, location.end) !== location.xml) {
    throw new ShipFormatError(
      `replaceShipBlueprint: the file changed since "${location.name}" was found`
    );
  }
  return fileText.slice(0, location.start) + newXml + fileText.slice(location.end);
}

const TEXT_ELEMENTS = ["class", "name", "desc", "unlock"] as const;
const IMAGE_ELEMENTS = ["shieldImage", "cloakImage", "floorImage"] as const;
const SYSTEM_ATTRIBUTES = new Set(["power", "room", "start", "max", "img", "weapon"]);
const WEAPON_LIST_ATTRIBUTES = new Set(["count", "missiles", "load"]);
const DRONE_LIST_ATTRIBUTES = new Set(["count", "drones", "load"]);
const CREW_ATTRIBUTES = new Set(["amount", "class", "max"]);
const BLUEPRINT_ATTRIBUTES = new Set(["name", "layout", "img"]);

/**
 * Parses one `<shipBlueprint>` element. `xml` may contain other text around
 * it (comments, whitespace, even a whole file); the first ship blueprint
 * found is used.
 *
 * Unknown child elements, and repeats of elements that may appear only once,
 * are kept verbatim in `extraElements`. Throws {@link ShipFormatError} when
 * there is no blueprint, a required attribute is missing or a number cannot
 * be read.
 */
export function parseShipBlueprint(xml: string): ShipBlueprint {
  const el = findElementsDeep(parseXml(xml), "shipBlueprint")[0];
  if (!el) throw new ShipFormatError("No <shipBlueprint> element found");
  const raw = (e: XmlElement) => xml.slice(e.start, e.end);

  const bp: ShipBlueprint = {
    name: requiredAttr(el, "name"),
    layout: requiredAttr(el, "layout"),
    img: requiredAttr(el, "img"),
    texts: {},
    systems: [],
    augments: [],
    crew: [],
    extraElements: [],
  };
  const extraAttributes = extras(el, BLUEPRINT_ATTRIBUTES);
  if (extraAttributes) bp.extraAttributes = extraAttributes;

  const seen = new Set<string>();
  const once = (child: XmlElement): boolean => {
    if (seen.has(child.name)) {
      bp.extraElements.push(raw(child));
      return false;
    }
    seen.add(child.name);
    return true;
  };

  for (const child of elements(el.children)) {
    const name = child.name;
    if ((TEXT_ELEMENTS as readonly string[]).includes(name)) {
      if (once(child)) bp.texts[name as keyof ShipTexts] = parseText(child);
    } else if (name === "systemList") {
      if (once(child)) {
        for (const s of elements(child.children)) bp.systems.push(parseSystem(s, xml));
      }
    } else if (name === "weaponSlots" || name === "droneSlots") {
      if (once(child)) bp[name] = parseNumber(textOf(child), `<${name}>`);
    } else if (name === "weaponList") {
      if (once(child)) bp.weaponList = parseWeaponList(child);
    } else if (name === "droneList") {
      if (once(child)) bp.droneList = parseDroneList(child);
    } else if (name === "aug") {
      bp.augments.push(child.attributes.name ?? "");
    } else if (name === "health" || name === "maxPower") {
      if (once(child)) bp[name] = numAttr(child, "amount");
    } else if (name === "crewCount") {
      bp.crew.push(parseCrew(child));
    } else if ((IMAGE_ELEMENTS as readonly string[]).includes(name)) {
      if (once(child)) bp[name as (typeof IMAGE_ELEMENTS)[number]] = textOf(child).trim();
    } else {
      bp.extraElements.push(raw(child));
    }
  }
  return orderBlueprint(bp);
}

/** Rebuilds the object with a fixed property order (cosmetic, helps diffs and snapshots). */
function orderBlueprint(bp: ShipBlueprint): ShipBlueprint {
  const out: Partial<ShipBlueprint> = { name: bp.name, layout: bp.layout, img: bp.img };
  if (bp.extraAttributes) out.extraAttributes = bp.extraAttributes;
  const texts: ShipTexts = {};
  for (const k of TEXT_ELEMENTS) if (bp.texts[k]) texts[k] = bp.texts[k];
  out.texts = texts;
  out.systems = bp.systems;
  if (bp.weaponSlots !== undefined) out.weaponSlots = bp.weaponSlots;
  if (bp.droneSlots !== undefined) out.droneSlots = bp.droneSlots;
  if (bp.weaponList) out.weaponList = bp.weaponList;
  if (bp.droneList) out.droneList = bp.droneList;
  out.augments = bp.augments;
  if (bp.health !== undefined) out.health = bp.health;
  if (bp.maxPower !== undefined) out.maxPower = bp.maxPower;
  out.crew = bp.crew;
  for (const k of IMAGE_ELEMENTS) if (bp[k] !== undefined) out[k] = bp[k];
  out.extraElements = bp.extraElements;
  return out as ShipBlueprint;
}

function parseText(el: XmlElement): ShipText {
  const id = el.attributes.id;
  if (id !== undefined) return { kind: "id", id };
  return { kind: "text", text: textOf(el).trim() };
}

function parseSystem(el: XmlElement, source: string): ShipSystem {
  const sys: ShipSystem = {
    system: el.name,
    power: numAttr(el, "power"),
    room: numAttr(el, "room"),
  };
  const a = el.attributes;
  if (a.start !== undefined) sys.start = parseBool(a.start, `<${el.name} start>`);
  if (a.max !== undefined) sys.max = numAttr(el, "max");
  if (a.img !== undefined) sys.img = a.img;
  if (a.weapon !== undefined) sys.weapon = a.weapon;
  const slotEl = firstElement(el.children, "slot");
  if (slotEl) {
    const slot: StationSlot = {};
    const number = firstElement(slotEl.children, "number");
    const direction = firstElement(slotEl.children, "direction");
    if (number) slot.number = parseNumber(textOf(number), `<${el.name}><slot><number>`);
    if (direction) slot.direction = textOf(direction).trim();
    sys.slot = slot;
  }
  const extraAttributes = extras(el, SYSTEM_ATTRIBUTES);
  if (extraAttributes) sys.extraAttributes = extraAttributes;
  const extraElements = elements(el.children)
    .filter((c) => c !== slotEl)
    .map((c) => source.slice(c.start, c.end));
  if (extraElements.length > 0) sys.extraElements = extraElements;
  return sys;
}

function parseWeaponList(el: XmlElement): WeaponList {
  const list: WeaponList = { items: [] };
  if (el.attributes.count !== undefined) list.count = numAttr(el, "count");
  if (el.attributes.missiles !== undefined) list.missiles = numAttr(el, "missiles");
  if (el.attributes.load !== undefined) list.load = el.attributes.load;
  list.items = elements(el.children, "weapon").map((w) => w.attributes.name ?? "");
  const extraAttributes = extras(el, WEAPON_LIST_ATTRIBUTES);
  if (extraAttributes) list.extraAttributes = extraAttributes;
  return list;
}

function parseDroneList(el: XmlElement): DroneList {
  const list: DroneList = { items: [] };
  if (el.attributes.count !== undefined) list.count = numAttr(el, "count");
  if (el.attributes.drones !== undefined) list.drones = numAttr(el, "drones");
  if (el.attributes.load !== undefined) list.load = el.attributes.load;
  list.items = elements(el.children, "drone").map((d) => d.attributes.name ?? "");
  const extraAttributes = extras(el, DRONE_LIST_ATTRIBUTES);
  if (extraAttributes) list.extraAttributes = extraAttributes;
  return list;
}

function parseCrew(el: XmlElement): CrewCount {
  const crew: CrewCount = { amount: numAttr(el, "amount"), race: el.attributes.class ?? "" };
  if (el.attributes.max !== undefined) crew.max = numAttr(el, "max");
  const extraAttributes = extras(el, CREW_ATTRIBUTES);
  if (extraAttributes) crew.extraAttributes = extraAttributes;
  return crew;
}

function extras(el: XmlElement, known: Set<string>): ExtraAttributes | undefined {
  let out: ExtraAttributes | undefined;
  for (const [k, v] of Object.entries(el.attributes)) {
    if (known.has(k)) continue;
    out ??= {};
    out[k] = v;
  }
  return out;
}

function parseNumber(s: string, where: string): number {
  const t = s.trim();
  const v = Number(t);
  if (t === "" || !Number.isFinite(v))
    throw new ShipFormatError(`${where}: "${s}" is not a number`);
  return v;
}

function numAttr(el: XmlElement, name: string): number {
  const v = el.attributes[name];
  if (v === undefined) throw new ShipFormatError(`<${el.name}>: missing attribute "${name}"`);
  return parseNumber(v, `<${el.name} ${name}>`);
}

function requiredAttr(el: XmlElement, name: string): string {
  const v = el.attributes[name];
  if (v === undefined) throw new ShipFormatError(`<${el.name}>: missing attribute "${name}"`);
  return v;
}

function parseBool(s: string, where: string): boolean {
  const t = s.trim().toLowerCase();
  if (t === "true" || t === "1") return true;
  if (t === "false" || t === "0") return false;
  throw new ShipFormatError(`${where}: "${s}" is not true/false`);
}

/** Options for {@link writeShipBlueprint}. */
export interface BlueprintWriteOptions extends WriteOptions {
  /** Indentation level of the `<shipBlueprint>` line itself. Default 0. */
  baseLevel?: number;
}

/**
 * Writes one `<shipBlueprint>` element, indented, with a trailing line
 * ending. Known elements are written in a fixed order (texts, systemList,
 * slots, weapon/drone lists, augments, health, maxPower, crew, image names),
 * then the unknown elements verbatim.
 */
export function writeShipBlueprint(bp: ShipBlueprint, options?: BlueprintWriteOptions): string {
  const { lineEnding, indent } = resolveWriteOptions(options);
  const L = options?.baseLevel ?? 0;
  const w = new XmlWriter(indent);
  w.open(L, "shipBlueprint", [
    ["name", bp.name],
    ["layout", bp.layout],
    ["img", bp.img],
    ...Object.entries(bp.extraAttributes ?? {}),
  ]);
  for (const k of TEXT_ELEMENTS) {
    const t = bp.texts[k];
    if (!t) continue;
    if (t.kind === "id") w.empty(L + 1, k, [["id", t.id]]);
    else w.textElement(L + 1, k, t.text);
  }
  w.open(L + 1, "systemList");
  for (const s of bp.systems) {
    const attrs: Array<[string, string | number | boolean | undefined]> = [
      ["power", s.power],
      ["max", s.max],
      ["room", s.room],
      ["start", s.start],
      ["img", s.img],
      ["weapon", s.weapon],
      ...Object.entries(s.extraAttributes ?? {}),
    ];
    const extraElements = s.extraElements ?? [];
    if (!s.slot && extraElements.length === 0) {
      w.empty(L + 2, s.system, attrs);
      continue;
    }
    w.open(L + 2, s.system, attrs);
    if (s.slot) {
      w.open(L + 3, "slot");
      if (s.slot.direction !== undefined) w.textElement(L + 4, "direction", s.slot.direction);
      if (s.slot.number !== undefined) w.textElement(L + 4, "number", String(s.slot.number));
      w.close(L + 3, "slot");
    }
    for (const raw of extraElements) w.raw(L + 3, raw);
    w.close(L + 2, s.system);
  }
  w.close(L + 1, "systemList");
  if (bp.weaponSlots !== undefined) w.textElement(L + 1, "weaponSlots", String(bp.weaponSlots));
  if (bp.droneSlots !== undefined) w.textElement(L + 1, "droneSlots", String(bp.droneSlots));
  if (bp.weaponList) {
    const l = bp.weaponList;
    writeList(w, L + 1, "weaponList", "weapon", l.items, [
      ["count", l.count],
      ["missiles", l.missiles],
      ["load", l.load],
      ...Object.entries(l.extraAttributes ?? {}),
    ]);
  }
  if (bp.droneList) {
    const l = bp.droneList;
    writeList(w, L + 1, "droneList", "drone", l.items, [
      ["count", l.count],
      ["drones", l.drones],
      ["load", l.load],
      ...Object.entries(l.extraAttributes ?? {}),
    ]);
  }
  for (const aug of bp.augments) w.empty(L + 1, "aug", [["name", aug]]);
  if (bp.health !== undefined) w.empty(L + 1, "health", [["amount", bp.health]]);
  if (bp.maxPower !== undefined) w.empty(L + 1, "maxPower", [["amount", bp.maxPower]]);
  for (const c of bp.crew) {
    w.empty(L + 1, "crewCount", [
      ["amount", c.amount],
      ["max", c.max],
      ["class", c.race],
      ...Object.entries(c.extraAttributes ?? {}),
    ]);
  }
  for (const k of IMAGE_ELEMENTS) {
    const v = bp[k];
    if (v !== undefined) w.textElement(L + 1, k, v);
  }
  for (const raw of bp.extraElements) w.raw(L + 1, raw);
  w.close(L, "shipBlueprint");
  return w.toString(lineEnding);
}

function writeList(
  w: XmlWriter,
  level: number,
  name: string,
  itemName: string,
  items: string[],
  attrs: Array<[string, string | number | boolean | undefined]>
): void {
  if (items.length === 0) {
    w.empty(level, name, attrs);
    return;
  }
  w.open(level, name, attrs);
  for (const item of items) w.empty(level + 1, itemName, [["name", item]]);
  w.close(level, name);
}
