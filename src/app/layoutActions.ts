/**
 * Layout edits on the open ship, each one undo step: moving, resizing, adding
 * and deleting rooms, doors and stations, with the selection that follows,
 * moving a whole selection (rooms with mounts, gibs and the hull picture), and
 * centring the ship on the game's screen.
 */
import { CELL_SIZE, type Rect, type Ship, type StationDirection } from "../core";
import type { Texts } from "../text";
import { moveGibs } from "./art/gibs";
import { moveMounts } from "./art/mounts";
import { movePicture } from "./art/pictures";
import type { CommandContext } from "./commands";
import { addDoorOnWall, type WallSegment } from "./layout/doors";
import { deleteSelection, systemsInRooms } from "./layout/remove";
import {
  addRoomChecked,
  changeRoom,
  moveRooms,
  outOfView,
  resizeRoom,
  type PlaceProblem,
} from "./layout/rooms";
import { centreOnScreen } from "./layout/screen";
import { placeStation, setStationDirection } from "./layout/stations";
import { EMPTY_SELECTION, isEmptySelection, selectionOf } from "./selection";
import { useEditor } from "./store";

const present = () => useEditor.getState().doc?.history.present.ship;

/** The message for a refused room placement. */
export function problemText(texts: Texts, problem: PlaceProblem): string {
  return texts.layout.problems[problem];
}

/**
 * With `texts`, says so when the placed rooms reach past the right or bottom
 * edge of the screen (allowed, but not visible in battle).
 */
function warnOutOfView(ship: Ship, ids: number[], texts: Texts | undefined): void {
  if (texts && outOfView(ship, ids))
    useEditor.getState().setNotice({ kind: "info", text: texts.layout.outOfView });
}

/**
 * Moves everything selected that moves, as one undo step: rooms (doors follow
 * as the rules say), mounts, gibs and the hull picture. With rooms in the
 * selection (dx, dy) are whole cells and the rest moves by as many pixels;
 * without, they are pixels. The hull picture moves as the Move picture tool
 * moves it: the floor, cloak and gibs with it, the mounts too unless "keep
 * mounts" is on (a selected mount still moves). Returns the problem when the
 * rooms cannot go there; then nothing moves.
 */
export function moveSelection(dx: number, dy: number, texts?: Texts): PlaceProblem | undefined {
  const ship = present();
  const { selection, artTool, edit, setArtTool } = useEditor.getState();
  if (!ship || (dx === 0 && dy === 0)) return undefined;
  const cells = selection.rooms.length > 0;
  let next = ship;
  if (cells) {
    const result = moveRooms(ship, selection.rooms, dx, dy);
    if (result.problem) return result.problem;
    next = result.ship;
  }
  const px = cells ? dx * CELL_SIZE : dx;
  const py = cells ? dy * CELL_SIZE : dy;
  const hull = selection.hullPicture;
  // Mounts and gibs ride on the hull picture, so only those it leaves behind move here.
  const mounts = hull && !artTool.keepMounts ? [] : selection.mounts;
  next = moveGibs(moveMounts(next, mounts, px, py), hull ? [] : selection.gibs, px, py);
  if (hull) {
    next = movePicture(next, "hull", px, py, artTool.keepMounts);
    setArtTool({ active: "hull" });
  }
  if (next === ship) return undefined;
  edit(() => next);
  if (cells) warnOutOfView(next, selection.rooms, texts);
  return undefined;
}

/**
 * Arrow keys: moves the selection by one cell when rooms are in it, else by
 * 1 px (10 px with `far`), or says why it cannot; false when nothing
 * selected moves.
 */
export function nudgeSelection(dx: number, dy: number, texts: Texts, far = false): boolean {
  const { selection } = useEditor.getState();
  const cells = selection.rooms.length > 0;
  if (!cells && selection.mounts.length + selection.gibs.length === 0 && !selection.hullPicture)
    return false;
  const step = cells || !far ? 1 : 10;
  const problem = moveSelection(dx * step, dy * step, texts);
  if (problem) useEditor.getState().setNotice({ kind: "info", text: problemText(texts, problem) });
  return true;
}

/** Deletes the selection; rooms that hold systems are deleted only after the user agrees. */
export async function deleteSelected(context: CommandContext): Promise<boolean> {
  const ship = present();
  const { selection } = useEditor.getState();
  if (!ship || isEmptySelection(selection)) return false;
  const systems = systemsInRooms(ship, selection.rooms).length;
  if (systems > 0) {
    const { title, message, confirm } = context.texts.layout.confirmDelete;
    const request = { title, message: message(systems), confirm, danger: true };
    if (!(await useEditor.getState().askConfirm(request))) return false;
  }
  if (useEditor.getState().doc?.history.present.ship !== ship) return false;
  useEditor.getState().edit((s) => deleteSelection(s, selection), EMPTY_SELECTION);
  return true;
}

/** Adds a room and selects it. Returns the problem when the rectangle is not free. */
export function addRoomAt(rect: Rect, texts?: Texts): PlaceProblem | undefined {
  const ship = present();
  if (!ship) return undefined;
  const result = addRoomChecked(ship, rect);
  if (result.problem) return result.problem;
  const id = ship.layout.rooms.length;
  useEditor.getState().edit(() => result.ship, selectionOf({ kind: "room", id }));
  warnOutOfView(result.ship, [id], texts);
  return undefined;
}

/**
 * Puts the ship (rooms and hull) where the game places its own ships on the
 * screen; nothing is recorded when it is there already.
 */
export function centreShipOnScreen(): void {
  const ship = present();
  if (!ship) return;
  const next = centreOnScreen(ship);
  if (next !== ship) useEditor.getState().edit(() => next);
}

/** Changes the position or size of a room from the inspector; returns the problem when refused. */
export function changeRoomValues(
  id: number,
  patch: Partial<Rect>,
  texts?: Texts
): PlaceProblem | undefined {
  const ship = present();
  if (!ship) return undefined;
  const result = changeRoom(ship, id, patch);
  if (result.problem) return result.problem;
  if (result.ship !== ship) {
    useEditor.getState().edit(() => result.ship);
    warnOutOfView(result.ship, [id], texts);
  }
  return undefined;
}

/** Gives a room a new rectangle of cells (the Select tool's handles); returns the problem when refused. */
export function resizeRoomTo(id: number, rect: Rect, texts?: Texts): PlaceProblem | undefined {
  const ship = present();
  if (!ship) return undefined;
  const result = resizeRoom(ship, id, rect);
  if (result.problem) return result.problem;
  if (result.ship !== ship) {
    useEditor.getState().edit(() => result.ship);
    warnOutOfView(result.ship, [id], texts);
  }
  return undefined;
}

/** Adds a door on the wall (or finds the one already there) and selects it. */
export function addDoorAt(wall: WallSegment): void {
  const ship = present();
  if (!ship) return;
  const { ship: next, index } = addDoorOnWall(ship, wall);
  useEditor.getState().edit(() => next, selectionOf({ kind: "door", index }));
}

/** Puts a system's station on a cell of its room and selects it. */
export function placeStationAt(system: number, number: number): void {
  const ship = present();
  if (!ship) return;
  const next = placeStation(ship, system, number);
  useEditor.getState().edit(() => next, selectionOf({ kind: "station", system }));
}

export function turnStation(system: number, direction: StationDirection): void {
  useEditor.getState().edit((s) => setStationDirection(s, system, direction));
}
