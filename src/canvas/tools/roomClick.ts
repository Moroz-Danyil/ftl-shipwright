/**
 * The room click of Ship and Hull: a plain click (no Shift, no drag) on a
 * room, with nothing else of the workspace under the pointer, opens Rooms
 * with that room selected. The tool still handles the press as before.
 */
import type { Point, Ship } from "../../core";
import type { ShipArt } from "../../app/art/model";
import { useEditor } from "../../app/store";
import { doorTolerance, hitTest } from "../hitTest";
import { draggedFar, type CanvasTool, type ToolPointer } from "./types";

/** Whether something of the workspace other than a room lies under the pointer. */
export type OthersAt = (ship: Ship, art: ShipArt, pointer: ToolPointer) => boolean;

/** The room a plain click at the pointer opens: a room (drawn) with no door, station or `others` there. */
function roomAt(pointer: ToolPointer, others: OthersAt): number | undefined {
  const state = useEditor.getState();
  const snap = state.doc?.history.present;
  if (!snap || pointer.shift || !state.view.layers.rooms) return undefined;
  const target = hitTest(snap.ship, pointer.p, doorTolerance(pointer.scale));
  if (target?.kind !== "room" || others(snap.ship, snap.art, pointer)) return undefined;
  return target.id;
}

export function withRoomClick(tool: CanvasTool, others: OthersAt = () => false): CanvasTool {
  let press: { room: number; start: Point } | null = null;
  return {
    down(pointer) {
      const room = roomAt(pointer, others);
      press = room === undefined ? null : { room, start: pointer.p };
      tool.down(pointer);
    },
    move(pointer) {
      if (press && draggedFar(press.start, pointer.p, pointer.scale)) press = null;
      tool.move(pointer);
    },
    up(pointer) {
      const clicked = press;
      press = null;
      tool.up(pointer);
      if (clicked && !draggedFar(clicked.start, pointer.p, pointer.scale))
        useEditor.getState().goToRoom(clicked.room);
    },
    leave() {
      tool.leave();
    },
    cancel() {
      press = null;
      tool.cancel();
    },
  };
}
