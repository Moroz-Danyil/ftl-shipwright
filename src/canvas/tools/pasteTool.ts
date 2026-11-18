/**
 * Pasting rooms on the canvas: while rooms are being pasted (Ctrl+V or
 * Ctrl+D in Rooms, or in Hull for rooms copied together with mounts and
 * gibs), they follow the pointer by whole cells, drawn as a ghost that is red
 * where they cannot go, with the mounts and gibs that come along; a click
 * places them. A refused click says why and they keep following; Esc or a
 * right click stops. With no paste going on, every event goes to the tool as
 * usual.
 */
import {
  CELL_SIZE,
  gibPositionPx,
  mountPositionPx,
  type Point,
  type Rect,
  type Ship,
} from "../../core";
import { endPasting, placePasting } from "../../app/clipboardActions";
import { offsetUnder, pasteProblem, shiftedClip } from "../../app/clipboard";
import { problemText } from "../../app/layoutActions";
import { useEditor, type Pasting } from "../../app/store";
import { loadedPictureNow } from "../pictures";
import type { CanvasTool, Overlay, ToolContext, ToolPointer } from "./types";

/** The ghost of the rooms being pasted, with the mounts and gibs copied together with them. */
export function pastingGhost(ship: Ship, { clip, offset }: Pasting): Overlay {
  const ghost: Overlay = {
    kind: "ghost",
    cells: shiftedClip(clip, offset),
    ok: !pasteProblem(ship, clip, offset),
  };
  if (!clip.art) return ghost;
  const { layout, layoutXml } = ship;
  const px = offset.dx * CELL_SIZE;
  const py = offset.dy * CELL_SIZE;
  const mounts: Point[] = clip.art.mounts.map((m) =>
    mountPositionPx(layout, layoutXml, { x: m.x + px, y: m.y + py })
  );
  const source = clip.art.source;
  const gibs: Rect[] = clip.art.gibs.map(({ gib, picture }) => {
    const at = gibPositionPx(layout, layoutXml, { x: gib.x + px, y: gib.y + py });
    const loaded = loadedPictureNow(source, picture);
    return { ...at, w: loaded?.width ?? CELL_SIZE, h: loaded?.height ?? CELL_SIZE };
  });
  return { ...ghost, mounts, gibs };
}

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
