/**
 * Game texts: `<text name="key">value</text>` tables.
 */
import type { ShipText } from "../model";
import { textOf } from "../xml";
import type { GameView } from "./gameView";
import { readTopLevelElements } from "./xmlLayers";

/** Language codes of the vanilla translations (`data/text-<code>.xml`). */
export const TRANSLATION_CODES = [
  "de",
  "es",
  "fr",
  "it",
  "ja",
  "pl",
  "pt",
  "ru",
  "zh-Hans",
] as const;

/** A key → text table. Plain data (a prototype-less object). */
export type TextTable = Record<string, string>;

export interface GameTexts {
  /** English, from every `data/text_*.xml`. */
  english: TextTable;
  /** The chosen translation, from `data/text-<code>.xml`. */
  translation?: TextTable;
  /** The translation's code. */
  language?: string;
}

/** Reads the `<text>` elements of one file into a table (later keys win). */
export async function loadTextFile(
  view: GameView,
  file: string,
  into: TextTable = Object.create(null) as TextTable
): Promise<TextTable> {
  for (const { element } of await readTopLevelElements(view, file)) {
    if (element.name !== "text") continue;
    const key = element.attributes.name;
    if (key !== undefined) into[key] = textOf(element);
  }
  return into;
}

/**
 * Loads the English table from every `data/text_*.xml` (in path order; a key
 * defined twice keeps the later value) and, if `language` is given, the
 * translation `data/text-<language>.xml`.
 */
export async function loadTexts(view: GameView, language?: string): Promise<GameTexts> {
  const files = (await view.list()).filter((p) => /^data\/text_[^/]*\.xml$/i.test(p)).sort();
  const english = Object.create(null) as TextTable;
  for (const file of files) await loadTextFile(view, file, english);
  const texts: GameTexts = { english };
  if (language !== undefined) {
    const file = `data/text-${language}.xml`;
    if (await view.has(file)) {
      texts.translation = await loadTextFile(view, file);
      texts.language = language;
    }
  }
  return texts;
}

/** The text for a key: the translation, else English, else `undefined`. */
export function lookupText(texts: GameTexts, key: string): string | undefined {
  if (texts.translation && Object.prototype.hasOwnProperty.call(texts.translation, key))
    return texts.translation[key];
  if (Object.prototype.hasOwnProperty.call(texts.english, key)) return texts.english[key];
  return undefined;
}

/** Resolves a text reference: inline text as is, an id through {@link lookupText}. */
export function resolveText(texts: GameTexts, text: ShipText | undefined): string | undefined {
  if (!text) return undefined;
  return text.kind === "text" ? text.text : lookupText(texts, text.id);
}
