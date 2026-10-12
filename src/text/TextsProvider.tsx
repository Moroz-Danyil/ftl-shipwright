import type { ReactNode } from "react";
import { en } from "./en";
import { LANGUAGES, TextsContext } from "./index";

export function TextsProvider({ language, children }: { language: string; children: ReactNode }) {
  return (
    <TextsContext.Provider value={LANGUAGES[language] ?? en}>{children}</TextsContext.Provider>
  );
}
