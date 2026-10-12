/** Names from the game's texts, for showing the ship's parts. */
import { useCallback } from "react";
import { resolveText } from "../core";
import { useTexts } from "../text";
import { useEditor, type GameData } from "./store";

/**
 * A system's title from the game (e.g. "Shields"); else the given fallback
 * (for systems the game has no blueprint for), else its id.
 */
export function systemName(data: GameData | undefined, system: string, fallback?: string): string {
  const entry = data?.catalogs.systems.find((s) => s.name === system);
  return (data && entry && resolveText(data.texts, entry.title)) || fallback || system;
}

/** A function naming systems with the game's titles and the interface's fallbacks. */
export function useSystemName(): (system: string) => string {
  const data = useEditor((s) => s.game.data);
  const texts = useTexts();
  return useCallback(
    (system: string) => systemName(data, system, texts.systems.fallbackNames[system]),
    [data, texts]
  );
}
