/**
 * The Select tool: click selects, Shift+click adds or removes, dragging a
 * selected room moves the selected rooms (snapped to cells), dragging on
 * empty canvas draws a selection box.
 */
import { CELL_SIZE, doorSegmentPx, roomRectPx, type Point, type Rect, type Ship } from "../../core";
import { moveSelectedRooms } from "../../app/layoutActions";
import { moveProblem, shiftedRooms } from "../../app/layout/rooms";
import {
  EMPTY_SELECTION,
  isSelected,
  mergeSelections,
  selectionOf,
  toggleTarget,
  type Selection,
  type Target,
} from "../../app/selection";
import { useEditor } from "../../app/store";
import { doorTolerance, hitTest } from "../hitTest";
import { draggedFar, type CanvasTool, type ToolContext } from "./types";

type Gesture =
  | { kind: "press"; start: Point; target: Target; movable: boolean; collapse: boolean }
  | { kind: "move"; start: Point; dx: number; dy: number; ok: boolean }
  | { kind: "emptyPress"; start: Point; shift: boolean; base: Selection }
  | { kind: "box"; start: Point; end: Point; shift: boolean; base: Selection };

/** The rectangle spanned by two points. */
export function boxBetween(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

/** The rooms (wholly) and doors (by their middle) inside a box in ship pixels. */
export function targetsInBox(ship: Ship, box: Rect): Selection {
  const inside = (x: number, y: number) =>
    x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  const rooms = ship.layout.rooms
    .filter((room) => {
      const r = roomRectPx(ship.layout, room);
      return inside(r.x, r.y) && inside(r.x + r.w, r.y + r.h);
    })
    .map((r) => r.id);
  const doors: number[] = [];
  ship.layout.doors.forEach((door, index) => {
    const s = doorSegmentPx(ship.layout, door);
    if (inside((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2)) doors.push(index);
  });
  return { ...EMPTY_SELECTION, rooms: [...rooms].sort((a, b) => a - b), doors };
}

/** The whole-cell offset of a drag from `start` to `p` (ship pixels). */
export function cellOffset(start: Point, p: Point): { dx: number; dy: number } {
  return {
    dx: Math.round((p.x - start.x) / CELL_SIZE),
    dy: Math.round((p.y - start.y) / CELL_SIZE),
  };
}

/** `moveRooms`: whether dragging moves rooms (only in the Rooms workspace). */
export function createSelectTool(context: ToolContext, moveRooms = true): CanvasTool {
  let gesture: Gesture | null = null;
  const state = () => useEditor.getState();
  const ship = () => state().doc?.history.present.ship;

  const end = () => {
    gesture = null;
    context.setOverlay(null);
    context.setGesture(null);
  };

  const showMove = (s: Ship, g: Extract<Gesture, { kind: "move" }>) => {
    const rooms = state().selection.rooms;
    context.setOverlay({
      kind: "ghost",
      cells: shiftedRooms(s.layout, rooms, g.dx, g.dy),
      ok: g.ok,
    });
  };

  return {
    down({ p, shift, scale }) {
      const s = ship();
      if (!s) return;
      const target = hitTest(s, p, doorTolerance(scale));
      const selection = state().selection;
      if (!target) {
        gesture = { kind: "emptyPress", start: p, shift, base: selection };
      } else {
        let next = selection;
        let collapse = false;
        if (shift) next = toggleTarget(selection, target);
        else if (isSelected(selection, target)) collapse = true;
        else next = selectionOf(target);
        if (next !== selection) state().select(next);
        const movable = moveRooms && target.kind === "room" && isSelected(next, target);
        gesture = { kind: "press", start: p, target, movable, collapse };
      }
      context.setGesture(end);
    },

    move({ p, scale }) {
      const s = ship();
      if (!s) return;
      if (!gesture) {
        const target = hitTest(s, p, doorTolerance(scale));
        context.setOverlay(target ? { kind: "hover", target } : null);
        return;
      }
      if (gesture.kind === "press") {
        if (!gesture.movable || !draggedFar(gesture.start, p, scale)) return;
        gesture = { kind: "move", start: gesture.start, dx: 0, dy: 0, ok: true };
      }
      if (gesture.kind === "emptyPress") {
        if (!draggedFar(gesture.start, p, scale)) return;
        gesture = { ...gesture, kind: "box", end: p };
      }
      if (gesture.kind === "move") {
        const { dx, dy } = cellOffset(gesture.start, p);
        const ok = moveProblem(s, state().selection.rooms, dx, dy) === undefined;
        gesture = { ...gesture, dx, dy, ok };
        showMove(s, gesture);
      } else if (gesture.kind === "box") {
        gesture = { ...gesture, end: p };
        context.setOverlay({ kind: "box", rect: boxBetween(gesture.start, p) });
      }
    },

    up() {
      const s = ship();
      const g = gesture;
      end();
      if (!s || !g) return;
      if (g.kind === "press" && g.collapse) state().select(selectionOf(g.target));
      else if (g.kind === "emptyPress" && !g.shift) state().select(EMPTY_SELECTION);
      else if (g.kind === "move" && g.ok && (g.dx !== 0 || g.dy !== 0))
        moveSelectedRooms(g.dx, g.dy);
      else if (g.kind === "box") {
        const found = targetsInBox(s, boxBetween(g.start, g.end));
        state().select(g.shift ? mergeSelections(g.base, found) : found);
      }
    },

    leave() {
      if (!gesture) context.setOverlay(null);
    },

    cancel: end,
  };
}
