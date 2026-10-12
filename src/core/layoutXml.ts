/**
 * Reader and writer for the layout `.xml` (hull picture rect, floor/cloak
 * offsets, weapon mounts, gibs).
 */
import { ShipFormatError } from "./errors";
import type {
  ExtraAttributes,
  Gib,
  Mount,
  OffsetPoint,
  Point,
  Range,
  ShipLayoutXml,
} from "./model";
import { resolveWriteOptions, type WriteOptions } from "./options";
import {
  elements,
  firstElement,
  parseXml,
  textOf,
  XmlWriter,
  type XmlElement,
  type XmlNode,
} from "./xml";

const KNOWN_TOP_LEVEL = new Set(["img", "offsets", "glowOffset", "weaponMounts", "explosion"]);
const MOUNT_ATTRIBUTES = new Set(["x", "y", "rotate", "mirror", "gib", "slide"]);
const POINT_ATTRIBUTES = new Set(["x", "y"]);
const GIB_CHILDREN = new Set(["velocity", "direction", "angular", "x", "y", "glowOffset"]);
const NO_ATTRIBUTES = new Set<string>();

/** Attributes of `el` not in `known`, or undefined when there are none. */
function extraAttributesOf(el: XmlElement, known: Set<string>): ExtraAttributes | undefined {
  let out: ExtraAttributes | undefined;
  for (const [k, v] of Object.entries(el.attributes)) {
    if (known.has(k)) continue;
    out ??= {};
    out[k] = v;
  }
  return out;
}

/**
 * Parses a layout `.xml`. The content may be wrapped in `<FTL>` or have no
 * root element; comments are ignored. Unknown attributes and child elements
 * of `<offsets>`, its floor/cloak, `<weaponMounts>`, `<mount>`, `<explosion>`
 * and `<gibN>` are kept verbatim. Throws {@link ShipFormatError} when
 * `<img>` is missing or a number cannot be read.
 */
export function parseLayoutXml(text: string): ShipLayoutXml {
  const top = unwrapFtl(parseXml(text));
  const imgEl = firstElement(top, "img");
  if (!imgEl) throw new ShipFormatError("Layout .xml: no <img> element");
  const result: ShipLayoutXml = {
    img: {
      x: numAttr(imgEl, "x"),
      y: numAttr(imgEl, "y"),
      w: numAttr(imgEl, "w"),
      h: numAttr(imgEl, "h"),
    },
    mounts: [],
    gibs: [],
  };

  const offsets = firstElement(top, "offsets");
  if (offsets) {
    const floor = firstElement(offsets.children, "floor");
    const cloak = firstElement(offsets.children, "cloak");
    if (floor) result.floorOffset = offsetPoint(floor);
    if (cloak) result.cloakOffset = offsetPoint(cloak);
    const attrs = extraAttributesOf(offsets, NO_ATTRIBUTES);
    if (attrs) result.offsetsExtraAttributes = attrs;
    const rest = elements(offsets.children).filter((c) => c !== floor && c !== cloak);
    if (rest.length > 0) result.offsetsExtraElements = rest.map((c) => text.slice(c.start, c.end));
  }

  const glow = firstElement(top, "glowOffset");
  if (glow) result.glowOffset = pointAttr(glow);

  const mountsExtra: string[] = [];
  for (const list of elements(top, "weaponMounts")) {
    for (const m of elements(list.children)) {
      if (m.name === "mount") result.mounts.push(parseMount(m, text));
      else mountsExtra.push(text.slice(m.start, m.end));
    }
  }

  const numbered: Array<{ n: number; order: number; gib: Gib }> = [];
  const explosionExtra: string[] = [];
  for (const explosion of elements(top, "explosion")) {
    for (const el of elements(explosion.children)) {
      const match = /^gib(\d+)$/.exec(el.name);
      if (!match) {
        explosionExtra.push(text.slice(el.start, el.end));
        continue;
      }
      numbered.push({ n: Number(match[1]), order: numbered.length, gib: parseGib(el, text) });
    }
  }
  numbered.sort((a, b) => a.n - b.n || a.order - b.order);
  result.gibs = numbered.map((g) => g.gib);
  if (mountsExtra.length > 0) result.weaponMountsExtraElements = mountsExtra;
  if (explosionExtra.length > 0) result.explosionExtraElements = explosionExtra;

  const extra: string[] = [];
  for (const el of elements(top)) {
    if (!KNOWN_TOP_LEVEL.has(el.name)) extra.push(text.slice(el.start, el.end));
  }
  if (extra.length > 0) result.extraElements = extra;
  return result;
}

/** Top-level nodes with every top-level `<FTL>` element replaced by its children. */
export function unwrapFtl(nodes: XmlNode[]): XmlNode[] {
  const out: XmlNode[] = [];
  for (const node of nodes) {
    if (node.type === "element" && node.name === "FTL") out.push(...node.children);
    else out.push(node);
  }
  return out;
}

function parseMount(el: XmlElement, source: string): Mount {
  const mount: Mount = {
    x: numAttr(el, "x"),
    y: numAttr(el, "y"),
    rotate: boolAttr(el.attributes.rotate),
    mirror: boolAttr(el.attributes.mirror),
    gib: el.attributes.gib === undefined ? 0 : numAttr(el, "gib"),
  };
  if (el.attributes.slide !== undefined) mount.slide = el.attributes.slide;
  const extra = extraAttributesOf(el, MOUNT_ATTRIBUTES);
  if (extra) mount.extraAttributes = extra;
  const children = elements(el.children);
  if (children.length > 0) mount.extraElements = children.map((c) => source.slice(c.start, c.end));
  return mount;
}

function parseGib(el: XmlElement, source: string): Gib {
  const range = (name: string): Range => {
    const r = firstElement(el.children, name);
    if (!r) return { min: 0, max: 0 };
    return { min: optNumAttr(r, "min") ?? 0, max: optNumAttr(r, "max") ?? 0 };
  };
  const coord = (name: string): number => {
    const c = firstElement(el.children, name);
    if (!c) return 0;
    return parseNumber(textOf(c).trim(), `<${el.name}><${name}>`);
  };
  const gib: Gib = {
    velocity: range("velocity"),
    direction: range("direction"),
    angular: range("angular"),
    x: coord("x"),
    y: coord("y"),
  };
  const glow = firstElement(el.children, "glowOffset");
  if (glow) gib.glowOffset = pointAttr(glow);
  const attrs = extraAttributesOf(el, NO_ATTRIBUTES);
  if (attrs) gib.extraAttributes = attrs;
  // Unknown children, and repeats of known ones (only the first is modelled).
  const seen = new Set<string>();
  const rest: string[] = [];
  for (const c of elements(el.children)) {
    if (GIB_CHILDREN.has(c.name) && !seen.has(c.name)) seen.add(c.name);
    else rest.push(source.slice(c.start, c.end));
  }
  if (rest.length > 0) gib.extraElements = rest;
  return gib;
}

function boolAttr(value: string | undefined): boolean {
  if (value === undefined) return false;
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1";
}

function parseNumber(s: string, where: string): number {
  const v = Number(s);
  if (s.trim() === "" || !Number.isFinite(v))
    throw new ShipFormatError(`${where}: "${s}" is not a number`);
  return v;
}

function optNumAttr(el: XmlElement, name: string): number | undefined {
  const v = el.attributes[name];
  return v === undefined ? undefined : parseNumber(v, `<${el.name} ${name}>`);
}

function numAttr(el: XmlElement, name: string): number {
  const v = optNumAttr(el, name);
  if (v === undefined) throw new ShipFormatError(`<${el.name}>: missing attribute "${name}"`);
  return v;
}

function offsetPoint(el: XmlElement): OffsetPoint {
  const p: OffsetPoint = pointAttr(el);
  const extra = extraAttributesOf(el, POINT_ATTRIBUTES);
  if (extra) p.extraAttributes = extra;
  return p;
}

function pointAttr(el: XmlElement): Point {
  return { x: optNumAttr(el, "x") ?? 0, y: optNumAttr(el, "y") ?? 0 };
}

/**
 * Writes a layout `.xml` in the vanilla style: wrapped in `<FTL>`, sections in
 * the order img, offsets, glowOffset, weaponMounts, explosion, then any
 * unknown top-level elements verbatim.
 */
export function writeLayoutXml(xml: ShipLayoutXml, options?: WriteOptions): string {
  const { lineEnding, indent } = resolveWriteOptions(options);
  const w = new XmlWriter(indent);
  w.open(0, "FTL");
  w.empty(0, "img", [
    ["x", xml.img.x],
    ["y", xml.img.y],
    ["w", xml.img.w],
    ["h", xml.img.h],
  ]);
  const offsetsExtra = xml.offsetsExtraElements ?? [];
  if (xml.floorOffset || xml.cloakOffset || offsetsExtra.length > 0 || xml.offsetsExtraAttributes) {
    w.blank();
    w.open(0, "offsets", Object.entries(xml.offsetsExtraAttributes ?? {}));
    if (xml.floorOffset) w.empty(1, "floor", offsetAttrs(xml.floorOffset));
    if (xml.cloakOffset) w.empty(1, "cloak", offsetAttrs(xml.cloakOffset));
    for (const raw of offsetsExtra) w.raw(1, raw);
    w.close(0, "offsets");
  }
  if (xml.glowOffset) {
    w.blank();
    w.empty(0, "glowOffset", pointAttrs(xml.glowOffset));
  }
  w.blank();
  w.open(0, "weaponMounts");
  for (const m of xml.mounts) {
    const attrs: Array<[string, string | number | boolean | undefined]> = [
      ["x", m.x],
      ["y", m.y],
      ["rotate", m.rotate],
      ["mirror", m.mirror],
      ["gib", m.gib],
      ["slide", m.slide],
      ...Object.entries(m.extraAttributes ?? {}),
    ];
    const children = m.extraElements ?? [];
    if (children.length === 0) {
      w.empty(1, "mount", attrs);
      continue;
    }
    w.open(1, "mount", attrs);
    for (const raw of children) w.raw(2, raw);
    w.close(1, "mount");
  }
  for (const raw of xml.weaponMountsExtraElements ?? []) w.raw(1, raw);
  w.close(0, "weaponMounts");
  w.blank();
  w.open(0, "explosion");
  xml.gibs.forEach((g, index) => {
    const name = `gib${index + 1}`;
    w.open(1, name, Object.entries(g.extraAttributes ?? {}));
    w.empty(2, "velocity", rangeAttrs(g.velocity));
    w.empty(2, "direction", rangeAttrs(g.direction));
    w.empty(2, "angular", rangeAttrs(g.angular));
    if (g.glowOffset) w.empty(2, "glowOffset", pointAttrs(g.glowOffset));
    w.textElement(2, "x", String(g.x));
    w.textElement(2, "y", String(g.y));
    for (const raw of g.extraElements ?? []) w.raw(2, raw);
    w.close(1, name);
  });
  for (const raw of xml.explosionExtraElements ?? []) w.raw(1, raw);
  w.close(0, "explosion");
  for (const raw of xml.extraElements ?? []) {
    w.blank();
    w.raw(0, raw);
  }
  w.close(0, "FTL");
  return w.toString(lineEnding);
}

function offsetAttrs(p: OffsetPoint): Array<[string, string | number]> {
  return [...pointAttrs(p), ...Object.entries(p.extraAttributes ?? {})];
}

function pointAttrs(p: Point): Array<[string, number]> {
  return [
    ["x", p.x],
    ["y", p.y],
  ];
}

function rangeAttrs(r: Range): Array<[string, number]> {
  return [
    ["min", r.min],
    ["max", r.max],
  ];
}
