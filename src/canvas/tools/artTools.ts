/**
 * The Hull tools: Move picture drags a picture; Mount adds mounts and
 * drags them; Gib selects and drags gibs; Select picks mounts (and gibs when
 * they are shown). Drags move by whole pixels and are one undo step.
 */
import { mountPositionPx, type Point, type Ship } from "../../core";
import { addMountAtPoint, moveSelectedArt, moveShipPicture } from "../../app/artActions";
import type { ShipArt } from "../../app/art/model";
import type { MovablePicture } from "../../app/art/pictures";
import {
  EMPTY_SELECTION,
  isSelected,
  selectionOf,
  toggleTarget,
  type Target,
} from "../../app/selection";
import { useEditor } from "../../app/store";
import {
  MOUNT_HIT_RADIUS,
  gibAt,
  gibRectPx,
  mountAt,
  pictureAt,
  pictureRectPx,
} from "../artHitTest";
import { draggedFar, type CanvasTool, type ToolContext, type ToolPointer } from "./types";

/** The pictures shown in Hull: all but the cloak, which follows its layer. */
const shownPictures = (): Record<MovablePicture, boolean> => ({
  hull: true,
  floor: true,
  cloak: useEditor.getState().view.layers.cloak,
  shield: true,
});

const current = () => useEditor.getState().doc?.history.present;

/** The pixel offset of a drag (whole pixels). */
export function pixelOffset(start: Point, p: Point): { dx: number; dy: number } {
  return { dx: Math.round(p.x - start.x), dy: Math.round(p.y - start.y) };
}

export function createMovePictureTool(context: ToolContext): CanvasTool {
  let drag: { picture: MovablePicture; start: Point; dx: number; dy: number } | null = null;

  const chosenAt = (ship: Ship, art: ShipArt, p: Point): MovablePicture | undefined => {
    const chosen = useEditor.getState().artTool.picture;
    return chosen === "auto" ? pictureAt(ship, art, p, shownPictures()) : chosen;
  };
  const outline = (ship: Ship, art: ShipArt, picture: MovablePicture, dx = 0, dy = 0) => {
    const r = pictureRectPx(ship, art, picture);
    context.setOverlay(r ? { kind: "outline", rect: { ...r, x: r.x + dx, y: r.y + dy } } : null);
  };
  const stop = () => {
    drag = null;
    context.setOverlay(null);
    context.setGesture(null);
  };

  return {
    down({ p }) {
      const snap = current();
      const picture = snap && chosenAt(snap.ship, snap.art, p);
      if (!snap || !picture) return;
      drag = { picture, start: p, dx: 0, dy: 0 };
      useEditor.getState().setArtTool({ active: picture });
      outline(snap.ship, snap.art, picture);
      context.setGesture(stop);
    },
    move({ p }) {
      const snap = current();
      if (!snap) return;
      if (!drag) {
        const picture = chosenAt(snap.ship, snap.art, p);
        if (picture) outline(snap.ship, snap.art, picture);
        else context.setOverlay(null);
        return;
      }
      const { dx, dy } = pixelOffset(drag.start, p);
      drag = { ...drag, dx, dy };
      outline(snap.ship, snap.art, drag.picture, dx, dy);
    },
    up() {
      const d = drag;
      stop();
      if (d && (d.dx !== 0 || d.dy !== 0)) moveShipPicture(d.picture, d.dx, d.dy);
    },
    leave() {
      if (!drag) context.setOverlay(null);
    },
    cancel: stop,
  };
}

type Finder = (ship: Ship, art: ShipArt, pointer: ToolPointer) => Target | undefined;

/**
 * A tool that picks mounts or gibs: a click selects (Shift adds or removes),
 * a drag moves the selected ones. `onEmpty` handles a click where nothing is.
 */
function createArtPicker(
  context: ToolContext,
  find: Finder,
  onEmpty: (pointer: ToolPointer) => void
): CanvasTool {
  let drag: { start: Point; dx: number; dy: number; moving: boolean; collapse?: Target } | null =
    null;
  const state = () => useEditor.getState();

  const ghost = (ship: Ship, art: ShipArt, dx: number, dy: number) => {
    const { mounts, gibs } = state().selection;
    const xml = ship.layoutXml;
    context.setOverlay({
      kind: "artGhost",
      mounts: mounts.map((i) => {
        const p = mountPositionPx(ship.layout, xml, xml.mounts[i]);
        return { x: p.x + dx, y: p.y + dy };
      }),
      gibs: gibs.map((i) => {
        const r = gibRectPx(ship, art, i);
        return { ...r, x: r.x + dx, y: r.y + dy };
      }),
    });
  };
  const stop = () => {
    drag = null;
    context.setOverlay(null);
    context.setGesture(null);
  };

  return {
    down(pointer) {
      const snap = current();
      if (!snap) return;
      const target = find(snap.ship, snap.art, pointer);
      if (!target) {
        onEmpty(pointer);
        return;
      }
      const selection = state().selection;
      let collapse: Target | undefined;
      if (pointer.shift) state().select(toggleTarget(selection, target));
      else if (isSelected(selection, target)) collapse = target;
      else state().select(selectionOf(target));
      drag = { start: pointer.p, dx: 0, dy: 0, moving: false, collapse };
      context.setGesture(stop);
    },
    move(pointer) {
      const snap = current();
      if (!snap) return;
      if (!drag) {
        const target = find(snap.ship, snap.art, pointer);
        context.setOverlay(target ? { kind: "hover", target } : null);
        return;
      }
      if (!drag.moving && !draggedFar(drag.start, pointer.p, pointer.scale)) return;
      const { dx, dy } = pixelOffset(drag.start, pointer.p);
      drag = { ...drag, dx, dy, moving: true };
      ghost(snap.ship, snap.art, dx, dy);
    },
    up() {
      const d = drag;
      stop();
      if (!d) return;
      if (d.moving && (d.dx !== 0 || d.dy !== 0)) moveSelectedArt(d.dx, d.dy);
      else if (!d.moving && d.collapse) state().select(selectionOf(d.collapse));
    },
    leave() {
      if (!drag) context.setOverlay(null);
    },
    cancel: stop,
  };
}

const findMount: Finder = (ship, _art, { p, scale }) => {
  const index = mountAt(ship, p, Math.max(MOUNT_HIT_RADIUS, 6 / scale));
  return index === undefined ? undefined : { kind: "mount", index };
};

const findGib: Finder = (ship, art, { p }) => {
  const index = gibAt(ship, art, p);
  return index === undefined ? undefined : { kind: "gib", index };
};

const clear = (pointer: ToolPointer) => {
  if (!pointer.shift) useEditor.getState().select(EMPTY_SELECTION);
};

export function createMountTool(context: ToolContext): CanvasTool {
  return createArtPicker(context, findMount, ({ p }) => {
    const problem = addMountAtPoint(p);
    if (problem) context.say(context.texts.art.mountProblems[problem]);
  });
}

export function createGibTool(context: ToolContext): CanvasTool {
  return createArtPicker(context, findGib, clear);
}

/** The Select tool in Hull: mounts, and gibs when they are shown. */
export function createArtSelectTool(context: ToolContext): CanvasTool {
  return createArtPicker(
    context,
    (ship, art, pointer) =>
      findMount(ship, art, pointer) ??
      (useEditor.getState().view.layers.gibs ? findGib(ship, art, pointer) : undefined),
    clear
  );
}
