/**
 * Copy, cut, paste and duplicate (Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+D) with the
 * editor's own clipboard, in Rooms and Hull; each change is one undo step.
 *
 * Copy takes the selected rooms, mounts and gibs; copied together, the
 * mounts and gibs ride with the rooms. Pasted or duplicated rooms follow the
 * pointer while it is on the canvas, until a click places them (Esc or a
 * right click cancels); with the pointer elsewhere they go straight to the
 * first free place next to where they were copied. Mounts and gibs copied
 * without rooms land under the pointer, or a few pixels from the copied
 * ones; duplicates always land a few pixels off. Rooms paste in Rooms, mounts
 * and gibs in Hull, and what was copied together pastes together in both.
 * Duplicating leaves the clipboard as it is. What is pasted is selected.
 * Rooms carry their systems; a system the ship already has stays out, and
 * the notice names it.
 */
import { CELL_SIZE, shipToHullPx } from "../core";
import type { Texts } from "../text";
import {
  ART_PASTE_OFFSET,
  artOffsetUnder,
  copyArt,
  copyRooms,
  freeOffsetNextTo,
  offsetUnder,
  pasteArt,
  pasteRooms,
  type ArtClip,
  type Offset,
  type RoomsClip,
} from "./clipboard";
import type { CommandContext } from "./commands";
import { setGestureCancel } from "./gesture";
import { outOfView, type PlaceProblem } from "./layout/rooms";
import { withoutSelection } from "./layoutActions";
import { systemName } from "./names";
import { canvasPointer } from "./pointer";
import { EMPTY_SELECTION } from "./selection";
import { useEditor } from "./store";

const state = () => useEditor.getState();
const snapshot = () => state().doc?.history.present;
const say = (text: string) => state().setNotice({ kind: "info", text });

/** Rooms and Hull have the clipboard; Ship has none. */
const hasClipboard = () => state().workspace !== "ship";

/** The selected rooms (with the selected mounts and gibs riding on them) and the selected mounts and gibs. */
function clipsOfSelection(): { rooms?: RoomsClip; art?: ArtClip } {
  const snap = snapshot();
  if (!snap) return {};
  const { selection } = state();
  const art = copyArt(snap, selection);
  const rooms = copyRooms(snap.ship, selection.rooms);
  return { rooms: rooms && (art ? { ...rooms, art } : rooms), art };
}

/** Copies the selected rooms, mounts and gibs; false when there is nothing to copy. */
export function copySelection(texts: Texts, cut = false): boolean {
  if (!hasClipboard()) return false;
  const { clipboard, setClipboard } = state();
  const { rooms, art } = clipsOfSelection();
  if (!rooms && !art) return false;
  setClipboard({ ...clipboard, ...(rooms && { rooms }), ...(art && { art }) });
  const parts: string[] = [];
  if (rooms)
    parts.push(texts.clipboard.rooms(rooms.rooms.length, rooms.systems.length, rooms.doors.length));
  if (art) parts.push(texts.clipboard.art(art.mounts.length, art.gibs.length));
  say((cut ? texts.clipboard.cut : texts.clipboard.copied)(texts.clipboard.together(parts)));
  return true;
}

/**
 * Copies the selection, then deletes it. Rooms go without asking, even with
 * systems: the systems are in the clipboard and come back with a paste.
 */
export function cutSelection(context: CommandContext): boolean {
  if (!copySelection(context.texts, true)) return false;
  const { selection, editSnapshot } = state();
  editSnapshot((s) => withoutSelection(s, selection), EMPTY_SELECTION);
  return true;
}

/**
 * Pastes: in Rooms the rooms copied last (with the mounts and gibs copied
 * together with them); in Hull the mounts and gibs copied last, with their
 * rooms when they were copied together. False when there is nothing for it.
 */
export function pasteClipboard(texts: Texts): boolean {
  const { workspace, clipboard } = state();
  const { rooms, art } = clipboard;
  if (workspace === "rooms" && rooms) return startRoomsPaste(rooms, texts);
  if (workspace === "hull" && rooms?.art && rooms.art === art) return startRoomsPaste(rooms, texts);
  if (workspace === "hull" && art) return pasteArtClip(art, true, texts);
  return false;
}

/** Pastes a copy of the selection at once, without changing the clipboard. */
export function duplicateSelection(texts: Texts): boolean {
  if (!hasClipboard()) return false;
  const { rooms, art } = clipsOfSelection();
  if (rooms) return startRoomsPaste(rooms, texts);
  return art ? pasteArtClip(art, false, texts) : false;
}

// ---------------------------------------------------------------------------
// Rooms

/** Lets the rooms follow the pointer when it is on the canvas, else places them next to the copied ones. */
function startRoomsPaste(clip: RoomsClip, texts: Texts): boolean {
  const { view, setPasting } = state();
  const ship = snapshot()?.ship;
  if (!ship) return false;
  const p = canvasPointer(view.camera);
  if (p) {
    setPasting({ clip, offset: offsetUnder(ship, clip, p) });
    setGestureCancel(() => state().setPasting(null));
    say(texts.clipboard.place);
    return true;
  }
  const offset = freeOffsetNextTo(ship, clip);
  if (!offset) say(texts.clipboard.noFreePlace);
  else placeRooms(clip, offset, texts);
  return true;
}

/**
 * Adds copied rooms shifted by whole cells, with the mounts and gibs copied
 * together with them shifted as far, and selects them; returns the problem
 * when the rooms are refused. Mounts that would be more than eight stay out,
 * with their gibs, and the notice says so.
 */
export function placeRooms(
  clip: RoomsClip,
  offset: Offset,
  texts?: Texts
): PlaceProblem | undefined {
  const snap = snapshot();
  if (!snap) return undefined;
  const result = pasteRooms(snap.ship, clip, offset);
  if (result.problem) return result.problem;
  const withRooms = { ...snap, ship: result.ship };
  const art = clip.art
    ? pasteArt(withRooms, clip.art, { dx: offset.dx * CELL_SIZE, dy: offset.dy * CELL_SIZE })
    : undefined;
  const placed = art && !art.full ? art : undefined;
  state().editSnapshot(() => placed?.snapshot ?? withRooms, {
    ...EMPTY_SELECTION,
    rooms: result.ids,
    mounts: placed?.mounts ?? [],
    gibs: placed?.gibs ?? [],
  });
  if (!texts) return undefined;
  const data = state().game.data;
  const messages = [
    ...(result.leftOut.length > 0
      ? [texts.clipboard.systemsLeftOut(result.leftOut.map((s) => systemName(data, s)))]
      : []),
    ...(art?.full ? [texts.art.mountProblems.full] : []),
    ...(placed && placed.skipped > 0 ? [texts.clipboard.gibsLeftOut(placed.skipped)] : []),
    ...(outOfView(result.ship, result.ids) ? [texts.layout.outOfView] : []),
  ];
  if (messages.length > 0) say(messages.join(" "));
  return undefined;
}

/** Places the rooms following the pointer where they are; returns the problem when refused (they keep following). */
export function placePasting(texts: Texts): PlaceProblem | undefined {
  const pasting = state().pasting;
  if (!pasting) return undefined;
  // The notice about placing goes; a refusal or the frame's notice may replace it.
  state().setNotice(undefined);
  const problem = placeRooms(pasting.clip, pasting.offset, texts);
  if (!problem) endPasting();
  return problem;
}

/** Stops the rooms following the pointer, without a change. */
export function endPasting(): void {
  if (!state().pasting) return;
  state().setPasting(null);
  setGestureCancel(null);
}

// ---------------------------------------------------------------------------
// Mounts and gibs

/** Pastes mounts and gibs under the pointer (`underPointer`, when it is on the canvas) or a few pixels off. */
function pasteArtClip(clip: ArtClip, underPointer: boolean, texts: Texts): boolean {
  const snap = snapshot();
  if (!snap) return false;
  let offset: Offset = { dx: ART_PASTE_OFFSET, dy: ART_PASTE_OFFSET };
  const p = underPointer ? canvasPointer(state().view.camera) : undefined;
  if (p) offset = artOffsetUnder(clip, shipToHullPx(snap.ship.layout, snap.ship.layoutXml, p));
  const result = pasteArt(snap, clip, offset);
  if (result.full) {
    say(texts.art.mountProblems.full);
    return true;
  }
  if (result.mounts.length + result.gibs.length > 0)
    state().editSnapshot(() => result.snapshot, {
      ...EMPTY_SELECTION,
      mounts: result.mounts,
      gibs: result.gibs,
    });
  if (result.skipped > 0) say(texts.clipboard.gibsLeftOut(result.skipped));
  return true;
}
