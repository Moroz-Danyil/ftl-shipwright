/**
 * Listens to the keyboard for the whole window and runs the bound commands.
 */
import { useEffect } from "react";
import { usePlatform } from "../platform/PlatformContext";
import { useTexts } from "../text";
import { runCommand } from "./commands";
import { DEFAULT_BINDINGS, commandForEvent, isTextField, type KeyBinding } from "./keys";
import { useEditor } from "./store";

export function useKeyboard(bindings: KeyBinding[] = DEFAULT_BINDINGS): void {
  const platform = usePlatform();
  const texts = useTexts();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = useEditor.getState();
      if (!state.doc || state.dialog) return;
      const command = commandForEvent(event, bindings);
      if (!command) return;
      const typing = isTextField(event.target);
      if (typing && command !== "save") return;
      if (command === "pan") {
        state.setPanHeld(true);
        event.preventDefault();
        return;
      }
      const repeats = command === "undo" || command === "redo" || command.startsWith("move.");
      if (event.repeat && !repeats) return;
      if (runCommand(command, { platform, texts })) event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (commandForEvent(event, bindings) === "pan") useEditor.getState().setPanHeld(false);
    };
    const onBlur = () => useEditor.getState().setPanHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [bindings, platform, texts]);
}
