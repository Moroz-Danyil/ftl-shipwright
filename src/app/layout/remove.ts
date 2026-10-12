/**
 * Deleting a selection: stations, doors and rooms in one change. Removing a
 * room also removes its doors and systems, and the ids of the rooms after it
 * move down by one (the core keeps them 0..n-1).
 */
import { removeDoor, removeRoom, type Ship } from "../../core";
import type { Selection } from "../selection";
import { removeStation } from "./stations";

/** The systems that deleting these rooms would remove with them. */
export function systemsInRooms(ship: Ship, roomIds: number[]): number[] {
  const out: number[] = [];
  ship.blueprint.systems.forEach((s, i) => {
    if (roomIds.includes(s.room)) out.push(i);
  });
  return out;
}

export function deleteSelection(ship: Ship, selection: Selection): Ship {
  let next = ship;
  for (const system of selection.stations) next = removeStation(next, system);
  for (const index of [...selection.doors].sort((a, b) => b - a)) next = removeDoor(next, index);
  for (const id of [...selection.rooms].sort((a, b) => b - a)) next = removeRoom(next, id);
  return next;
}
