/**
 * What is selected on the canvas: rooms (by id), doors (by index into the
 * layout's doors), crew stations (by index of their system in the
 * blueprint), weapon mounts and gibs (by index). Selections are plain
 * immutable data.
 */
import type { Ship } from "../core";
import { isStationSystem, stationOf } from "./layout/stations";

export interface Selection {
  rooms: number[];
  doors: number[];
  stations: number[];
  mounts: number[];
  gibs: number[];
}

/** One thing on the canvas. */
export type Target =
  | { kind: "room"; id: number }
  | { kind: "door"; index: number }
  | { kind: "station"; system: number }
  | { kind: "mount"; index: number }
  | { kind: "gib"; index: number };

export const EMPTY_SELECTION: Selection = {
  rooms: [],
  doors: [],
  stations: [],
  mounts: [],
  gibs: [],
};

const LISTS = ["rooms", "doors", "stations", "mounts", "gibs"] as const;
const KEYS = {
  room: "rooms",
  door: "doors",
  station: "stations",
  mount: "mounts",
  gib: "gibs",
} as const;

function targetKey(target: Target): { list: keyof Selection; value: number } {
  const list = KEYS[target.kind];
  const value =
    target.kind === "room" ? target.id : target.kind === "station" ? target.system : target.index;
  return { list, value };
}

export function selectionOf(...targets: Target[]): Selection {
  return targets.reduce((sel, t) => addTarget(sel, t), EMPTY_SELECTION);
}

export function isEmptySelection(selection: Selection): boolean {
  return selectionSize(selection) === 0;
}

export function selectionSize(selection: Selection): number {
  return LISTS.reduce((n, list) => n + selection[list].length, 0);
}

export function isSelected(selection: Selection, target: Target): boolean {
  const { list, value } = targetKey(target);
  return selection[list].includes(value);
}

export function addTarget(selection: Selection, target: Target): Selection {
  if (isSelected(selection, target)) return selection;
  const { list, value } = targetKey(target);
  return { ...selection, [list]: [...selection[list], value].sort((a, b) => a - b) };
}

/** Adds the target, or removes it when it is already selected (Shift+click). */
export function toggleTarget(selection: Selection, target: Target): Selection {
  if (!isSelected(selection, target)) return addTarget(selection, target);
  const { list, value } = targetKey(target);
  return { ...selection, [list]: selection[list].filter((v) => v !== value) };
}

/** Everything in either selection. */
export function mergeSelections(a: Selection, b: Selection): Selection {
  const out = { ...EMPTY_SELECTION };
  for (const list of LISTS)
    out[list] = [...new Set([...a[list], ...b[list]])].sort((m, n) => m - n);
  return out;
}

/** The one selected thing, when exactly one is selected. */
export function singleTarget(selection: Selection): Target | undefined {
  if (selectionSize(selection) !== 1) return undefined;
  if (selection.rooms.length === 1) return { kind: "room", id: selection.rooms[0] };
  if (selection.doors.length === 1) return { kind: "door", index: selection.doors[0] };
  if (selection.stations.length === 1) return { kind: "station", system: selection.stations[0] };
  if (selection.mounts.length === 1) return { kind: "mount", index: selection.mounts[0] };
  return { kind: "gib", index: selection.gibs[0] };
}

/** True when the system is one with a crew station and its station lies in its room. */
export function hasStation(ship: Ship, systemIndex: number): boolean {
  const system = ship.blueprint.systems[systemIndex];
  return !!system && isStationSystem(system.system) && stationOf(ship, systemIndex) !== undefined;
}

/** The part of a selection that still exists in the ship (after undo, redo or a delete). */
export function validSelection(ship: Ship, selection: Selection): Selection {
  const valid: Selection = {
    rooms: selection.rooms.filter((id) => ship.layout.rooms.some((r) => r.id === id)),
    doors: selection.doors.filter((i) => i < ship.layout.doors.length),
    stations: selection.stations.filter((i) => hasStation(ship, i)),
    mounts: selection.mounts.filter((i) => i < ship.layoutXml.mounts.length),
    gibs: selection.gibs.filter((i) => i < ship.layoutXml.gibs.length),
  };
  return LISTS.every((list) => valid[list].length === selection[list].length) ? selection : valid;
}
