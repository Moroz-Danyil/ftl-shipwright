/**
 * Access to the interface texts. Components read them with `useTexts()`;
 * `TextsProvider` decides the language (only English for now).
 */
import { createContext, useContext } from "react";
import { en, type Texts } from "./en";

export type { Texts } from "./en";

/** The languages the interface offers, by code. */
export const LANGUAGES: Record<string, Texts> = { en };

export const DEFAULT_LANGUAGE = "en";

export const TextsContext = createContext<Texts>(en);

export function useTexts(): Texts {
  return useContext(TextsContext);
}
