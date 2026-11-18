/**
 * Resizing a room on the canvas: in Rooms, with the Select tool, the one
 * selected room has handles on its edges and corners (see `resizeHandles.ts`).
 * Dragging one resizes the room by whole cells under the rules for drawing
 * rooms; a ghost with the size in cells shows the new rectangle, red when it
 * is refused, and on release the notice says why. The change is one undo
 * step and Esc cancels it. Any other press goes to the Select tool; a door
 * or station on an edge wins over that edge's handle (not over a corner).
 */
import { roomRectPx, type Point, type Rect, type Room } from "../../core";
import { problemText, resizeRoomTo } from "../../app/layoutActions";
import { placementProblem, roomArea } from "../../app/layout/rooms";
import { singleTarget } from "../../app/selection";
import { currentTool, useEditor, type EditorState } from "../../app/store";
import { doorTolerance, hitTest } from "../hitTest";
import { HANDLE_CURSORS, handleAt, resizedRect, type Handle } from "../resizeHandles";
import { cellOffset } from "./selectTool";
import { draggedFar, type CanvasTool, type ToolContext, type ToolPointer } from "./types";

/** The room that shows resize handles: the one selected room in Rooms with the Select tool. */
export function resizableRoom(s: EditorState): Room | undefined {
  const ship = s.doc?.history.present.ship;
  if (!ship || s.workspace !== "rooms" || currentTool(s) !== "select") return undefined;
  if (s.view.hangarPreview || !s.view.layers.rooms) return undefined;
  const target = singleTarget(s.selection);
  if (target?.kind !== "room") return undefined;
  return ship.layout.rooms.find((r) => r.id === target.id);
}

/** The handle of the resizable room under the pointer, if any. */
function handleUnder(pointer: ToolPointer): { room: Room; handle: Handle } | undefined {
  const state = useEditor.getState();
  const room = resizableRoom(state);
  const ship = state.doc?.history.present.ship;
  if (!room || !ship) return undefined;
  const handle = handleAt(roomRectPx(ship.layout, room), pointer.p, pointer.scale);
  if (!handle) return undefined;
  if (handle.length === 1) {
    const other = hitTest(ship, pointer.p, doorTolerance(pointer.scale));
    if (other?.kind === "door" || other?.kind === "station") return undefined;
  }
  return { room, handle };
}

const sameRect = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

export function withRoomResize(tool: CanvasTool, context: ToolContext): CanvasTool {
  let drag: {
    room: Room;
    handle: Handle;
    start: Point;
    rect: Rect;
    moving: boolean;
  } | null = null;
  const cursor = (value: string | null) => context.setCursor?.(value);
  const stop = () => {
    drag = null;
    context.setOverlay(null);
    context.setGesture(null);
    cursor(null);
  };

  return {
    down(pointer) {
      const under = handleUnder(pointer);
      if (!under) {
        tool.down(pointer);
        return;
      }
      drag = { ...under, start: pointer.p, rect: under.room, moving: false };
      cursor(HANDLE_CURSORS[under.handle]);
      context.setGesture(stop);
    },
    move(pointer) {
      if (!drag) {
        tool.move(pointer);
        const under = handleUnder(pointer);
        cursor(under ? HANDLE_CURSORS[under.handle] : null);
        return;
      }
      const ship = useEditor.getState().doc?.history.present.ship;
      if (!ship) return;
      if (!drag.moving && !draggedFar(drag.start, pointer.p, pointer.scale)) return;
      const { dx, dy } = cellOffset(drag.start, pointer.p);
      const rect = resizedRect(drag.room, drag.handle, dx, dy);
      const ok = !placementProblem(
        ship.layout.rooms,
        [rect],
        new Set([drag.room.id]),
        roomArea(ship)
      );
      drag = { ...drag, rect, moving: true };
      context.setOverlay({ kind: "ghost", cells: [rect], ok, size: true });
    },
    up(pointer) {
      const d = drag;
      if (!d) {
        tool.up(pointer);
        return;
      }
      stop();
      if (!d.moving || sameRect(d.rect, d.room)) return;
      const problem = resizeRoomTo(d.room.id, d.rect, context.texts);
      if (problem) context.say(problemText(context.texts, problem));
    },
    leave() {
      if (drag) return;
      tool.leave();
      cursor(null);
    },
    cancel() {
      if (drag) stop();
      tool.cancel();
    },
  };
}
