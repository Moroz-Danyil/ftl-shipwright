/**
 * Listens to the keyboard for the whole window and runs the bound commands
 * (not while a dialog, the hangar preview or the tour is open). The keys are
 * the ones chosen in Settings, so a change there takes effect at once.
 */
import { useEffect, useMemo } from "react";
import { usePlatform } from "../platform/PlatformContext";
import { useTexts } from "../text";
import { runCommand } from "./commands";
import { bindingsOf, commandForEvent, isTextField } from "./keys";
import { useEditor } from "./store";

export function useKeyboard(): void {
  const platform = usePlatform();
  const texts = useTexts();
  const keys = useEditor((s) => s.keys);
  const bindings = useMemo(() => bindingsOf(keys), [keys]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = useEditor.getState();
      const busy = state.dialog || state.confirmation || state.tour || state.view.hangarPreview;
      if (!state.doc || busy) return;
      const command = commandForEvent(event, bindings);
      if (!command) return;
      const typing = isTextField(event.target);
      if (typing && command !== "save") return;
      if (command === "pan") {
        state.setPanHeld(true);
        event.preventDefault();
        return;
      }
      const repeats = command === "undo" || command === "redo" || command.startsWith("move");
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
