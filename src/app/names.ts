/** Names from the game's texts, for showing the ship's parts. */
import { resolveText } from "../core";
import type { GameData } from "./store";

/** A system's title from the game (e.g. "Shields"), else its id. */
export function systemName(data: GameData | undefined, system: string): string {
  const entry = data?.catalogs.systems.find((s) => s.name === system);
  return (data && entry && resolveText(data.texts, entry.title)) || system;
}
