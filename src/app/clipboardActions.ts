/**
 * Copy, cut, paste and duplicate (Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+D) with the
 * editor's own clipboard, in Rooms and Hull; each change is one undo step.
 *
 * In Rooms, pasted or duplicated rooms follow the pointer while it is on the
 * canvas, until a click places them (Esc or a right click cancels); with the
 * pointer elsewhere they go straight to the first free place next to where
 * they were copied. In Hull, pasted mounts and gibs land under the pointer,
 * or a few pixels from the copied ones; duplicates always land a few pixels
 * off. Duplicating leaves the clipboard as it is. What is pasted is selected.
 * Rooms carry their systems; a system the ship has already stays out, and
 * the notice names it.
 */
import { shipToHullPx } from "../core";
import type { Texts } from "../text";
import { deleteSelectedArt } from "./artActions";
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
import { deleteSelection } from "./layout/remove";
import { systemName } from "./names";
import { canvasPointer } from "./pointer";
import { EMPTY_SELECTION } from "./selection";
import { useEditor } from "./store";

const state = () => useEditor.getState();
const snapshot = () => state().doc?.history.present;
const say = (text: string) => state().setNotice({ kind: "info", text });

/** Copies the selected rooms (Rooms) or mounts and gibs (Hull); false when there is nothing to copy. */
export function copySelection(texts: Texts, cut = false): boolean {
  const { workspace, selection, clipboard, setClipboard } = state();
  const snap = snapshot();
  if (!snap) return false;
  const words = cut ? texts.clipboard.cut : texts.clipboard.copied;
  if (workspace === "rooms") {
    const rooms = copyRooms(snap.ship, selection.rooms);
    if (!rooms) return false;
    setClipboard({ ...clipboard, rooms });
    say(words(texts.clipboard.rooms(rooms.rooms.length, rooms.systems.length, rooms.doors.length)));
    return true;
  }
  if (workspace === "hull") {
    const art = copyArt(snap, selection);
    if (!art) return false;
    setClipboard({ ...clipboard, art });
    say(words(texts.clipboard.art(art.mounts.length, art.gibs.length)));
    return true;
  }
  return false;
}

/**
 * Copies the selection, then deletes it. Rooms go without asking, even with
 * systems: the systems are in the clipboard and come back with a paste.
 */
export function cutSelection(context: CommandContext): boolean {
  if (!copySelection(context.texts, true)) return false;
  const { workspace, selection, edit } = state();
  if (workspace === "hull") deleteSelectedArt();
  else edit((s) => deleteSelection(s, selection), EMPTY_SELECTION);
  return true;
}

/** Pastes what was copied in this workspace; false when the clipboard has nothing for it. */
export function pasteClipboard(texts: Texts): boolean {
  const { workspace, clipboard } = state();
  if (workspace === "rooms" && clipboard.rooms) return startRoomsPaste(clipboard.rooms, texts);
  if (workspace === "hull" && clipboard.art) return pasteArtClip(clipboard.art, true, texts);
  return false;
}

/** Pastes a copy of the selection at once, without changing the clipboard. */
export function duplicateSelection(texts: Texts): boolean {
  const { workspace, selection } = state();
  const snap = snapshot();
  if (!snap) return false;
  if (workspace === "rooms") {
    const clip = copyRooms(snap.ship, selection.rooms);
    return clip ? startRoomsPaste(clip, texts) : false;
  }
  if (workspace === "hull") {
    const clip = copyArt(snap, selection);
    return clip ? pasteArtClip(clip, false, texts) : false;
  }
  return false;
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

/** Adds copied rooms shifted by whole cells and selects them; returns the problem when refused. */
export function placeRooms(
  clip: RoomsClip,
  offset: Offset,
  texts?: Texts
): PlaceProblem | undefined {
  const ship = snapshot()?.ship;
  if (!ship) return undefined;
  const result = pasteRooms(ship, clip, offset);
  if (result.problem) return result.problem;
  state().edit(() => result.ship, { ...EMPTY_SELECTION, rooms: result.ids });
  if (!texts) return undefined;
  const data = state().game.data;
  const messages = [
    ...(result.leftOut.length > 0
      ? [texts.clipboard.systemsLeftOut(result.leftOut.map((s) => systemName(data, s)))]
      : []),
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
// Hull

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
