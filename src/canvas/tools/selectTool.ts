/**
 * The Select tool, the same in every workspace. A press on a thing selects
 * it and a drag moves it at once; a click selects (Shift+click adds or
 * removes); a drag on empty canvas draws a selection box. Under the pointer
 * it picks, in this order, a weapon mount, a gib (when gibs are shown), a
 * crew station or door, a room and the hull picture, each only when its
 * layer is drawn. Dragging a selected thing moves everything selected that
 * moves: rooms (with their doors) by whole cells, and then mounts, gibs and
 * the hull picture by as many pixels so they stay aligned; without rooms,
 * by whole pixels. A move the room rules refuse shows red and, on release,
 * the notice says why. After a click, a drag or a box the workspace that
 * edits the selection opens (see `followSelection`). Over the hull picture,
 * Shift+drag draws a box and Shift+click adds or removes the picture.
 */
import {
  CELL_SIZE,
  doorSegmentPx,
  hullRectPx,
  mountPositionPx,
  roomRectPx,
  type Point,
  type Rect,
  type Ship,
} from "../../core";
import type { ShipArt } from "../../app/art/model";
import { moveSelection, problemText } from "../../app/layoutActions";
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
import { MOUNT_HIT_RADIUS, gibAt, gibRectPx, mountAt } from "../artHitTest";
import { doorTolerance, hitTest } from "../hitTest";
import { shownLayers } from "../shownLayers";
import { pixelOffset } from "./artTools";
import {
  draggedFar,
  type CanvasTool,
  type Overlay,
  type ToolContext,
  type ToolPointer,
} from "./types";

/** The kinds of things Select can pick, by whether their layer is drawn. */
export interface Pickable {
  rooms: boolean;
  doors: boolean;
  stations: boolean;
  mounts: boolean;
  gibs: boolean;
  hull: boolean;
}

/** Everything (for tests and tools that do not look at the layers). */
export const PICK_ALL: Pickable = {
  rooms: true,
  doors: true,
  stations: true,
  mounts: true,
  gibs: true,
  hull: true,
};

/** What Select picks in the current workspace: what the canvas draws there (Ship always draws the mounts). */
export function pickableNow(): Pickable {
  const { view, workspace } = useEditor.getState();
  const layers = shownLayers(view.layers, workspace, "select");
  return {
    rooms: layers.rooms,
    doors: layers.doors,
    stations: layers.stations,
    mounts: layers.mounts || workspace === "ship",
    gibs: layers.gibs,
    hull: layers.hull,
  };
}

const inside = (r: Rect, p: Point) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** The thing Select picks at the pointer: mount, gib, station or door, room, then the hull picture. */
export function targetAt(
  ship: Ship,
  art: ShipArt,
  { p, scale }: ToolPointer,
  pick: Pickable = pickableNow()
): Target | undefined {
  if (pick.mounts) {
    const index = mountAt(ship, p, Math.max(MOUNT_HIT_RADIUS, 6 / scale));
    if (index !== undefined) return { kind: "mount", index };
  }
  if (pick.gibs) {
    const index = gibAt(ship, art, p);
    if (index !== undefined) return { kind: "gib", index };
  }
  const hit = hitTest(ship, p, doorTolerance(scale), {
    stations: pick.stations,
    doors: pick.doors,
  });
  if (hit && (hit.kind !== "room" || pick.rooms)) return hit;
  if (pick.hull && art.hull && inside(hullRectPx(ship.layout, ship.layoutXml), p))
    return { kind: "hullPicture" };
  return undefined;
}

/** The kinds a drag can move; doors follow their rooms and stations stay in theirs. */
const MOVABLE = new Set<Target["kind"]>(["room", "mount", "gib", "hullPicture"]);

/** The rectangle spanned by two points. */
export function boxBetween(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

/**
 * The things inside a box in ship pixels: rooms and gibs wholly, doors by
 * their middle and mounts by their centre, each kind only when it can be
 * picked (gibs need the ship's pictures, `art`). The hull picture is only
 * picked by a click.
 */
export function targetsInBox(
  ship: Ship,
  box: Rect,
  art?: ShipArt,
  pick: Pickable = PICK_ALL
): Selection {
  const within = (x: number, y: number) => inside(box, { x, y });
  const wholly = (r: Rect) => within(r.x, r.y) && within(r.x + r.w, r.y + r.h);
  const rooms = pick.rooms
    ? ship.layout.rooms.filter((room) => wholly(roomRectPx(ship.layout, room))).map((r) => r.id)
    : [];
  const doors: number[] = [];
  if (pick.doors)
    ship.layout.doors.forEach((door, index) => {
      const s = doorSegmentPx(ship.layout, door);
      if (within((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2)) doors.push(index);
    });
  const mounts: number[] = [];
  if (pick.mounts)
    ship.layoutXml.mounts.forEach((mount, index) => {
      const c = mountPositionPx(ship.layout, ship.layoutXml, mount);
      if (within(c.x, c.y)) mounts.push(index);
    });
  const gibs: number[] = [];
  if (pick.gibs && art)
    ship.layoutXml.gibs.forEach((_, index) => {
      if (wholly(gibRectPx(ship, art, index))) gibs.push(index);
    });
  return { ...EMPTY_SELECTION, rooms: [...rooms].sort((a, b) => a - b), doors, mounts, gibs };
}

/** The whole-cell offset of a drag from `start` to `p` (ship pixels). */
export function cellOffset(start: Point, p: Point): { dx: number; dy: number } {
  return {
    dx: Math.round((p.x - start.x) / CELL_SIZE),
    dy: Math.round((p.y - start.y) / CELL_SIZE),
  };
}

/**
 * Where the selection would go, moved by (dx, dy): cells when rooms are in
 * it, else pixels. Rooms only: their ghost; mounts and gibs only: theirs;
 * otherwise one ghost with the rooms, mounts, gibs and the hull picture's
 * outline.
 */
export function moveGhost(
  ship: Ship,
  art: ShipArt,
  selection: Selection,
  dx: number,
  dy: number,
  ok: boolean
): Overlay {
  const cells = selection.rooms.length > 0;
  const px = cells ? dx * CELL_SIZE : dx;
  const py = cells ? dy * CELL_SIZE : dy;
  const xml = ship.layoutXml;
  const mounts = selection.mounts
    .filter((i) => xml.mounts[i])
    .map((i) => {
      const c = mountPositionPx(ship.layout, xml, xml.mounts[i]);
      return { x: c.x + px, y: c.y + py };
    });
  const gibs = selection.gibs
    .filter((i) => xml.gibs[i])
    .map((i) => {
      const r = gibRectPx(ship, art, i);
      return { ...r, x: r.x + px, y: r.y + py };
    });
  const hull = selection.hullPicture && art.hull ? hullRectPx(ship.layout, xml) : undefined;
  if (!cells && !hull) return { kind: "artGhost", mounts, gibs };
  return {
    kind: "ghost",
    cells: shiftedRooms(ship.layout, selection.rooms, dx, dy),
    ok,
    ...(mounts.length + gibs.length > 0 && { mounts, gibs }),
    ...(hull && { outline: { ...hull, x: hull.x + px, y: hull.y + py } }),
  };
}

type Gesture =
  | { kind: "press"; start: Point; target: Target; movable: boolean; collapse: boolean }
  | { kind: "move"; start: Point; dx: number; dy: number; ok: boolean }
  /** A press where nothing is picked; `hull`: a Shift+press on the hull picture. */
  | { kind: "emptyPress"; start: Point; shift: boolean; base: Selection; hull: boolean }
  | { kind: "box"; start: Point; end: Point; shift: boolean; base: Selection };

export function createSelectTool(context: ToolContext): CanvasTool {
  let gesture: Gesture | null = null;
  const state = () => useEditor.getState();
  const snapshot = () => state().doc?.history.present;

  const end = () => {
    gesture = null;
    context.setOverlay(null);
    context.setGesture(null);
  };

  return {
    down(pointer) {
      const snap = snapshot();
      if (!snap) return;
      const { p, shift } = pointer;
      const target = targetAt(snap.ship, snap.art, pointer);
      const selection = state().selection;
      if (!target || (shift && target.kind === "hullPicture")) {
        const hull = target !== undefined;
        gesture = { kind: "emptyPress", start: p, shift, base: selection, hull };
      } else {
        let next = selection;
        let collapse = false;
        if (shift) next = toggleTarget(selection, target);
        else if (isSelected(selection, target)) collapse = true;
        else next = selectionOf(target);
        if (next !== selection) state().select(next);
        const movable = MOVABLE.has(target.kind) && isSelected(next, target);
        gesture = { kind: "press", start: p, target, movable, collapse };
      }
      context.setGesture(end);
    },

    move(pointer) {
      const snap = snapshot();
      if (!snap) return;
      const { p, scale } = pointer;
      if (!gesture) {
        const target = targetAt(snap.ship, snap.art, pointer);
        const shown = target && target.kind !== "hullPicture";
        context.setOverlay(shown ? { kind: "hover", target } : null);
        return;
      }
      if (gesture.kind === "press") {
        if (!gesture.movable || !draggedFar(gesture.start, p, scale)) return;
        gesture = { kind: "move", start: gesture.start, dx: 0, dy: 0, ok: true };
      }
      if (gesture.kind === "emptyPress") {
        if (!draggedFar(gesture.start, p, scale)) return;
        gesture = {
          kind: "box",
          start: gesture.start,
          end: p,
          shift: gesture.shift,
          base: gesture.base,
        };
      }
      if (gesture.kind === "move") {
        const selection = state().selection;
        const rooms = selection.rooms;
        const { dx, dy } =
          rooms.length > 0 ? cellOffset(gesture.start, p) : pixelOffset(gesture.start, p);
        const ok = rooms.length === 0 || moveProblem(snap.ship, rooms, dx, dy) === undefined;
        gesture = { ...gesture, dx, dy, ok };
        context.setOverlay(moveGhost(snap.ship, snap.art, selection, dx, dy, ok));
      } else if (gesture.kind === "box") {
        gesture = { ...gesture, end: p };
        context.setOverlay({ kind: "box", rect: boxBetween(gesture.start, p) });
      }
    },

    up() {
      const snap = snapshot();
      const g = gesture;
      end();
      if (!snap || !g) return;
      if (g.kind === "press" && g.collapse) state().select(selectionOf(g.target));
      else if (g.kind === "emptyPress") {
        if (g.hull) state().select(toggleTarget(g.base, { kind: "hullPicture" }));
        else if (!g.shift) state().select(EMPTY_SELECTION);
      } else if (g.kind === "move" && (g.dx !== 0 || g.dy !== 0)) {
        const problem = moveSelection(g.dx, g.dy, context.texts);
        if (problem) context.say(problemText(context.texts, problem));
      } else if (g.kind === "box") {
        const found = targetsInBox(snap.ship, boxBetween(g.start, g.end), snap.art, pickableNow());
        state().select(g.shift ? mergeSelections(g.base, found) : found);
      }
      state().followSelection();
    },

    leave() {
      if (!gesture) context.setOverlay(null);
    },

    cancel: end,
  };
}
