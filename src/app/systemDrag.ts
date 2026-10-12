/**
 * Dragging a system chip from the palette: onto a room places (or moves) the
 * system, onto empty canvas or back onto the palette removes it. A press
 * without a drag is a click: it places the system in the selected room.
 * Pointer events are used rather than HTML drag and drop, which the desktop
 * window reserves for dropping files.
 */
import { pxToCell, roomAtCell } from "../core";
import { clientToShip } from "../canvas/canvasElement";
import type { Texts } from "../text";
import { setGestureCancel } from "./gesture";
import { placeSystemInRoom, removeSystemFromShip } from "./systemActions";
import { systemIndex } from "./systems/rules";
import { useEditor, type SystemDrag } from "./store";

/** Marks the palette element; a chip dropped on it is removed from the ship. */
export const PALETTE_ATTRIBUTE = "data-system-palette";

/** Screen pixels the pointer must travel before a press on a chip becomes a drag. */
const DRAG_THRESHOLD = 4;

/** Where a chip released at this window point would go. */
export function dropTargetAt(
  clientX: number,
  clientY: number
): Pick<SystemDrag, "room" | "target"> {
  const hit =
    typeof document.elementFromPoint === "function"
      ? document.elementFromPoint(clientX, clientY)
      : null;
  if (hit?.closest(`[${PALETTE_ATTRIBUTE}]`)) return { room: null, target: "remove" };
  const ship = useEditor.getState().doc?.history.present;
  const p = clientToShip(clientX, clientY);
  if (!ship || !p) return { room: null, target: "none" };
  const cell = pxToCell(ship.layout, p.x, p.y);
  const room = roomAtCell(ship.layout, cell.x, cell.y);
  return room ? { room: room.id, target: "room" } : { room: null, target: "remove" };
}

/** Applies a drop. Drops the rules refuse (the system is already in that room) change nothing. */
export function dropSystem(system: string, drop: Pick<SystemDrag, "room" | "target">): void {
  const ship = useEditor.getState().doc?.history.present;
  if (!ship) return;
  if (drop.target === "room" && drop.room !== null) placeSystemInRoom(system, drop.room);
  else if (drop.target === "remove" && systemIndex(ship, system) !== -1)
    removeSystemFromShip(system);
}

/** A click on a chip: puts the system in the one selected room, or says to select a room. */
export function clickSystem(system: string, texts: Texts): void {
  const state = useEditor.getState();
  const rooms = state.selection.rooms;
  if (rooms.length !== 1) {
    state.setNotice({ kind: "info", text: texts.systems.selectRoomFirst });
    return;
  }
  const problem = placeSystemInRoom(system, rooms[0]);
  if (problem) state.setNotice({ kind: "info", text: texts.systems.problems[problem] });
}

/** Starts following the pointer after a press on a palette chip. */
export function pressSystemChip(
  system: string,
  start: { clientX: number; clientY: number },
  texts: Texts
): void {
  let dragging = false;
  const store = () => useEditor.getState();

  const stop = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    setGestureCancel(null);
    store().setSystemDrag(null);
  };
  const onMove = (event: PointerEvent) => {
    const far = Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY);
    if (!dragging && far < DRAG_THRESHOLD) return;
    if (!dragging) {
      dragging = true;
      setGestureCancel(stop);
    }
    const drop = dropTargetAt(event.clientX, event.clientY);
    store().setSystemDrag({ system, clientX: event.clientX, clientY: event.clientY, ...drop });
  };
  const onUp = (event: PointerEvent) => {
    const wasDragging = dragging;
    stop();
    if (wasDragging) dropSystem(system, dropTargetAt(event.clientX, event.clientY));
    else clickSystem(system, texts);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}
