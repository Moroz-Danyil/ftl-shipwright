/**
 * Layout edits on the open ship, each one undo step: moving, adding and
 * deleting rooms, doors and stations, with the selection that follows.
 */
import type { Rect, StationDirection } from "../core";
import type { Texts } from "../text";
import type { CommandContext } from "./commands";
import { addDoorOnWall, type WallSegment } from "./layout/doors";
import { deleteSelection, systemsInRooms } from "./layout/remove";
import { addRoomChecked, changeRoom, moveRooms, type PlaceProblem } from "./layout/rooms";
import { placeStation, removeStation, setStationDirection } from "./layout/stations";
import { EMPTY_SELECTION, isEmptySelection, selectionOf } from "./selection";
import { useEditor } from "./store";

const present = () => useEditor.getState().doc?.history.present.ship;

/** The message for a refused room placement. */
export function problemText(texts: Texts, problem: PlaceProblem): string {
  return texts.layout.problems[problem];
}

/**
 * Moves the selected rooms by whole cells (doors follow as the rules say).
 * Returns the problem when the move is refused.
 */
export function moveSelectedRooms(dx: number, dy: number): PlaceProblem | undefined {
  const ship = present();
  const { selection, edit } = useEditor.getState();
  if (!ship || selection.rooms.length === 0) return undefined;
  const result = moveRooms(ship, selection.rooms, dx, dy);
  if (result.problem) return result.problem;
  if (result.ship !== ship) edit(() => result.ship);
  return undefined;
}

/** Arrow keys: moves the selected rooms by one cell, or says why it cannot. */
export function nudgeSelection(dx: number, dy: number, texts: Texts): boolean {
  if (useEditor.getState().selection.rooms.length === 0) return false;
  const problem = moveSelectedRooms(dx, dy);
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
export function addRoomAt(rect: Rect): PlaceProblem | undefined {
  const ship = present();
  if (!ship) return undefined;
  const result = addRoomChecked(ship, rect);
  if (result.problem) return result.problem;
  const id = ship.layout.rooms.length;
  useEditor.getState().edit(() => result.ship, selectionOf({ kind: "room", id }));
  return undefined;
}

/** Changes the position or size of a room from the inspector; returns the problem when refused. */
export function changeRoomValues(id: number, patch: Partial<Rect>): PlaceProblem | undefined {
  const ship = present();
  if (!ship) return undefined;
  const result = changeRoom(ship, id, patch);
  if (result.problem) return result.problem;
  if (result.ship !== ship) useEditor.getState().edit(() => result.ship);
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

export function deleteStation(system: number): void {
  useEditor.getState().edit((s) => removeStation(s, system), EMPTY_SELECTION);
}
