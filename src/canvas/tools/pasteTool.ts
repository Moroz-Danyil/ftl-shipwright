/**
 * Pasting rooms on the canvas: while rooms are being pasted (Ctrl+V or
 * Ctrl+D in Rooms), they follow the pointer by whole cells, drawn as a ghost
 * that is red where they cannot go, and a click places them. A refused click
 * says why and they keep following; Esc or a right click stops. With no
 * paste going on, every event goes to the Rooms tool as usual.
 */
import { endPasting, placePasting } from "../../app/clipboardActions";
import { offsetUnder } from "../../app/clipboard";
import { problemText } from "../../app/layoutActions";
import { useEditor } from "../../app/store";
import type { CanvasTool, ToolContext, ToolPointer } from "./types";

/** Moves the pasted rooms under the pointer. */
function follow(pointer: ToolPointer): void {
  const { pasting, setPasting, doc } = useEditor.getState();
  const ship = doc?.history.present.ship;
  if (!pasting || !ship) return;
  const offset = offsetUnder(ship, pasting.clip, pointer.p);
  if (offset.dx !== pasting.offset.dx || offset.dy !== pasting.offset.dy)
    setPasting({ ...pasting, offset });
}

export function withPaste(tool: CanvasTool, context: ToolContext): CanvasTool {
  /** The press placed the rooms (or tried to): its move and release are not the tool's. */
  let pressed = false;
  const pasting = () => useEditor.getState().pasting !== null;

  return {
    down(pointer) {
      if (!pasting()) {
        tool.down(pointer);
        return;
      }
      pressed = true;
      follow(pointer);
      const problem = placePasting(context.texts);
      if (problem) context.say(problemText(context.texts, problem));
    },
    move(pointer) {
      if (pasting()) {
        context.setOverlay(null);
        follow(pointer);
      } else if (!pressed) tool.move(pointer);
    },
    up(pointer) {
      if (pressed) pressed = false;
      else tool.up(pointer);
    },
    leave() {
      tool.leave();
    },
    cancel() {
      pressed = false;
      endPasting();
      tool.cancel();
    },
  };
}
