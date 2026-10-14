/** The game's interface texts (`data/text_misc.xml`) for the hangar screen. */
import { lookupText } from "../../core";
import { useEditor } from "../../app/store";

/** A text of the game's interface by its key; empty when the game has none. */
export function useGameText(key: string): string {
  const texts = useEditor((s) => s.game.data?.texts);
  return (texts && lookupText(texts, key)) ?? "";
}
