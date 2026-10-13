/**
 * Hull & art edits on the open ship, each one undo step: pictures, picture
 * moves, mounts and gibs.
 */
import type { Gib, MountSlide, Point } from "../core";
import { loadPictureRef } from "../canvas/pictures";
import { baseName } from "../platform/sources";
import type { Platform } from "../platform/types";
import type { Texts } from "../text";
import { addGib, moveGibs, removeGibs, setGibPicture, updateGib } from "./art/gibs";
import type { PictureRef, PictureSlot } from "./art/model";
import {
  addMountAt,
  moveMounts,
  removeMounts,
  setMountGib,
  setMountPosition,
  setSlide,
  swapMounts,
  toggleMirror,
  toggleRotate,
  type MountProblem,
} from "./art/mounts";
import {
  movePicture,
  setHullPicture,
  setOptionalPicture,
  type MovablePicture,
} from "./art/pictures";
import { reasonOf } from "./errors";
import { EMPTY_SELECTION, selectionOf } from "./selection";
import { useEditor, type PictureTarget } from "./store";

const state = () => useEditor.getState();
const snapshot = () => state().doc?.history.present;

/** Asks for a PNG file and reads it; `undefined` when cancelled or unreadable (a message says why). */
export async function pictureFromFile(
  platform: Platform,
  texts: Texts
): Promise<PictureRef | undefined> {
  const path = await platform.pickFile({
    filters: [{ name: texts.art.pngFilter, extensions: ["png"] }],
  });
  if (!path) return undefined;
  try {
    const bytes = await platform.readFile(path);
    return { kind: "file", name: baseName(path), bytes };
  } catch (error) {
    state().setNotice({
      kind: "error",
      text: texts.art.fileFailed(reasonOf(error, texts.errors.unknown)),
    });
    return undefined;
  }
}

/** Uses a picture for a slot, a gib or a new gib. Returns false when it is not a readable PNG. */
export async function choosePicture(
  target: PictureTarget,
  ref: PictureRef,
  texts: Texts
): Promise<boolean> {
  const current = snapshot();
  if (!current) return false;
  const size = await loadPictureRef(current.art.source, ref);
  if (!size) {
    state().setNotice({ kind: "error", text: texts.art.notPng });
    return false;
  }
  if ("newGib" in target) {
    const index = current.ship.layoutXml.gibs.length;
    state().editSnapshot((s) => addGib(s, ref), selectionOf({ kind: "gib", index }));
  } else if ("gib" in target) {
    state().editSnapshot((s) => setGibPicture(s, target.gib, ref));
  } else if (target.slot === "hull") {
    state().editSnapshot((s) => setHullPicture(s, ref, size));
  } else {
    const slot = target.slot;
    state().editSnapshot((s) => setOptionalPicture(s, slot, ref, size));
  }
  return true;
}

export function removePicture(slot: Exclude<PictureSlot, "hull">): void {
  state().editSnapshot((s) => setOptionalPicture(s, slot, undefined));
}

/** Moves a picture by whole pixels; it becomes the one the arrow keys move. */
export function moveShipPicture(picture: MovablePicture, dx: number, dy: number): void {
  const { keepMounts } = state().artTool;
  state().setArtTool({ active: picture });
  state().edit((s) => movePicture(s, picture, dx, dy, keepMounts));
}

/** Adds a mount at a ship pixel and selects it; returns the problem when refused. */
export function addMountAtPoint(p: Point): MountProblem | undefined {
  const current = snapshot();
  if (!current) return undefined;
  const result = addMountAt(current.ship, p);
  if (result.problem) return result.problem;
  state().edit(() => result.ship, selectionOf({ kind: "mount", index: result.index }));
  return undefined;
}

/** Moves a mount one place earlier (-1) or later (+1); it stays selected. */
export function reorderMount(index: number, step: -1 | 1): void {
  const other = index + step;
  const count = snapshot()?.ship.layoutXml.mounts.length ?? 0;
  if (other < 0 || other >= count) return;
  state().edit((s) => swapMounts(s, index, other), selectionOf({ kind: "mount", index: other }));
}

export const rotateMount = (index: number) => state().edit((s) => toggleRotate(s, index));
export const mirrorMount = (index: number) => state().edit((s) => toggleMirror(s, index));
export const slideMount = (index: number, slide: MountSlide) =>
  state().edit((s) => setSlide(s, index, slide));
export const linkMountGib = (index: number, gib: number) =>
  state().edit((s) => setMountGib(s, index, gib));
export const placeMount = (index: number, x: number, y: number) =>
  state().edit((s) => setMountPosition(s, index, x, y));

/** Rotates or mirrors every selected mount (keys `[` and `]`); false when none is selected. */
export function turnSelectedMounts(kind: "rotate" | "mirror"): boolean {
  const mounts = state().selection.mounts;
  if (mounts.length === 0) return false;
  state().edit((s) =>
    mounts.reduce((ship, i) => (kind === "rotate" ? toggleRotate : toggleMirror)(ship, i), s)
  );
  return true;
}

/** Moves the selected mounts and gibs by whole pixels. */
export function moveSelectedArt(dx: number, dy: number): boolean {
  const { mounts, gibs } = state().selection;
  if (mounts.length + gibs.length === 0) return false;
  state().edit((s) => moveGibs(moveMounts(s, mounts, dx, dy), gibs, dx, dy));
  return true;
}

export const changeGib = (index: number, patch: Partial<Gib>) =>
  state().edit((s) => updateGib(s, index, patch));

/** Deletes the selected mounts and gibs; false when none is selected. */
export function deleteSelectedArt(): boolean {
  const { mounts, gibs } = state().selection;
  if (mounts.length + gibs.length === 0) return false;
  state().editSnapshot(
    (s) => removeGibs({ ...s, ship: removeMounts(s.ship, mounts) }, gibs),
    EMPTY_SELECTION
  );
  return true;
}

/** Deletes one gib (from the list of explosion pieces). */
export function removeGib(index: number): void {
  state().editSnapshot((s) => removeGibs(s, [index]), EMPTY_SELECTION);
}

/**
 * Arrow keys in Hull & art: with the Move picture tool they move the picture
 * moved last (or the chosen one); otherwise the selected mounts and gibs.
 */
export function nudgeArt(dx: number, dy: number): boolean {
  const { tools, artTool } = state();
  if (tools.art === "movePicture") {
    const picture = artTool.picture === "auto" ? (artTool.active ?? "hull") : artTool.picture;
    moveShipPicture(picture, dx, dy);
    return true;
  }
  return moveSelectedArt(dx, dy);
}
