/**
 * Reading game XML files through a {@link GameView}: each layer (base file,
 * replacement, appends) is parsed on its own, Slipstream `mod:` instruction
 * elements are ignored and an `<FTL>` wrapper is looked through.
 */
import { unwrapFtl } from "../layoutXml";
import type { ShipText } from "../model";
import {
  elements,
  firstElement,
  parseXml,
  stripModInstructions,
  textOf,
  type XmlElement,
} from "../xml";
import type { GameView } from "./gameView";
import { decodeText } from "./sources";

/** A top-level element of a game XML file, with where it came from. */
export interface LayeredElement {
  element: XmlElement;
  /** The source text the element's offsets refer to. */
  source: string;
  /** The game file it belongs to (e.g. `data/blueprints.xml`). */
  file: string;
  /** True when it comes from the mod (an append or a replaced file). */
  fromMod: boolean;
}

/** Top-level elements of a file in the modded game, layer by layer. Empty when the file does not exist. */
export async function readTopLevelElements(
  view: GameView,
  file: string
): Promise<LayeredElement[]> {
  const layers = await view.readLayers(file);
  const out: LayeredElement[] = [];
  for (const layer of layers ?? []) {
    const source = decodeText(layer.bytes);
    const nodes = unwrapFtl(stripModInstructions(parseXml(source)));
    for (const element of elements(nodes))
      out.push({ element, source, file, fromMod: layer.fromMod });
  }
  return out;
}

/** A text element as a {@link ShipText}: `id` attribute, or the inline text (trimmed). */
export function readGameText(el: XmlElement | undefined): ShipText | undefined {
  if (!el) return undefined;
  if (el.attributes.id !== undefined) return { kind: "id", id: el.attributes.id };
  return { kind: "text", text: textOf(el).trim() };
}

/** The trimmed text of the first child element with this name. */
export function childText(el: XmlElement, name: string): string | undefined {
  const c = firstElement(el.children, name);
  return c ? textOf(c).trim() : undefined;
}

/** The number in the first child element with this name; `undefined` when missing or not a number. */
export function childNumber(el: XmlElement, name: string): number | undefined {
  const t = childText(el, name);
  if (t === undefined || t === "") return undefined;
  const v = Number(t);
  return Number.isFinite(v) ? v : undefined;
}

/** A number attribute; `undefined` when missing or not a number. */
export function numberAttribute(el: XmlElement, name: string): number | undefined {
  const t = el.attributes[name];
  if (t === undefined || t.trim() === "") return undefined;
  const v = Number(t);
  return Number.isFinite(v) ? v : undefined;
}
