/**
 * The editor's own clipboard: what Copy took (rooms with the doors between
 * them, weapon mounts and gibs, or rooms with mounts and gibs together), and
 * how it goes into a ship again. It lives as long as the app runs, so it can be pasted into
 * another ship opened later.
 *
 * Rooms are copied with everything the blueprint holds for their systems
 * (level, upgrade limit, installed at the start, interior picture, crew
 * station and the rest). A ship has each system once, so a system the ship
 * already has is left out of the pasted rooms; after a cut the systems are
 * gone from the ship, so a paste brings them back. Every door on the copied
 * rooms' walls comes along. One that only touched copied rooms (between
 * them, or an airlock) comes back where it touches only pasted rooms or
 * space; one to a room that was not copied comes back where its wall again
 * lies between a pasted room and another room of the ship. The others are
 * left out, so cut and paste in the same place gives back every door.
 */
import {
  CELL_SIZE,
  addDoor,
  addRoom,
  addSystem,
  anchorPx,
  doorSides,
  roomsBoundsCells,
  syncDoorRooms,
  updateLayoutXml,
  type FileSource,
  type Gib,
  type Mount,
  type Point,
  type Rect,
  type Ship,
  type ShipSystem,
} from "../core";
import { beyondBottomRight } from "../canvas/viewLimit";
import { appendGibs } from "./art/gibs";
import type { PictureRef, ShipSnapshot } from "./art/model";
import { MAX_MOUNTS } from "./art/mounts";
import { doorAt, isDoorWall, type WallSegment } from "./layout/doors";
import { placementProblem, roomArea, type PlaceProblem } from "./layout/rooms";
import type { Selection } from "./selection";

/** A door of the copied rooms; `outer` when it led to a room that was not copied. */
export interface ClipDoor extends WallSegment {
  outer: boolean;
}

/** Copied rooms: their cells where they were, their doors and their systems. */
export interface RoomsClip {
  rooms: Rect[];
  doors: ClipDoor[];
  /** The systems of the rooms, each with `room` as an index into `rooms`. */
  systems: ShipSystem[];
  /** Mounts and gibs copied together with the rooms, pasted shifted as far as the rooms. */
  art?: ArtClip;
}

/** Copied mounts and gibs, in hull pixels. */
export interface ArtClip {
  mounts: Mount[];
  /** Each gib with its number in the ship it came from and its picture. */
  gibs: Array<{ number: number; gib: Gib; picture: PictureRef | null }>;
  /** Where the gibs' game pictures are read from. */
  source: FileSource;
}

export interface Clipboard {
  rooms?: RoomsClip;
  art?: ArtClip;
}

/** A whole-cell or whole-pixel shift. */
export interface Offset {
  dx: number;
  dy: number;
}

/** How far pasted or duplicated mounts and gibs land from the copied ones, in hull pixels. */
export const ART_PASTE_OFFSET = 10;

/** How many cells to the right (or below) a free place for pasted rooms is looked for. */
const SEARCH_CELLS = 40;

// ---------------------------------------------------------------------------
// Rooms

/**
 * The rooms with these ids, the doors on their walls and their systems;
 * `undefined` without rooms.
 */
export function copyRooms(ship: Ship, ids: number[]): RoomsClip | undefined {
  const copied = ship.layout.rooms.filter((r) => ids.includes(r.id));
  if (copied.length === 0) return undefined;
  const rooms = copied.map(({ x, y, w, h }) => ({ x, y, w, h }));
  const order = copied.map((r) => r.id);
  const systems = ship.blueprint.systems
    .filter((s) => order.includes(s.room))
    .map((s) => ({ ...s, room: order.indexOf(s.room) }));
  const doors: ClipDoor[] = [];
  for (const door of ship.layout.doors) {
    const touched = doorSides(ship.layout, door).filter((id) => id !== -1);
    if (!touched.some((id) => order.includes(id))) continue;
    const { x, y, vertical } = door;
    doors.push({ x, y, vertical, outer: touched.some((id) => !order.includes(id)) });
  }
  return { rooms, doors, systems };
}

/** The copied rooms shifted by whole cells. */
export function shiftedClip(clip: RoomsClip, offset: Offset): Rect[] {
  return clip.rooms.map((r) => ({ ...r, x: r.x + offset.dx, y: r.y + offset.dy }));
}

/** Why the copied rooms cannot go there, or `undefined` when they can. */
export function pasteProblem(
  ship: Ship,
  clip: RoomsClip,
  offset: Offset
): PlaceProblem | undefined {
  return placementProblem(ship.layout.rooms, shiftedClip(clip, offset), new Set(), roomArea(ship));
}

/** The shift that puts the middle of the copied rooms under a ship pixel (whole cells). */
export function offsetUnder(ship: Ship, clip: RoomsClip, p: Point): Offset {
  const bounds = roomsBoundsCells({ rooms: clip.rooms.map((r, id) => ({ ...r, id })) })!;
  const anchor = anchorPx(ship.layout);
  const fx = (p.x - anchor.x) / CELL_SIZE;
  const fy = (p.y - anchor.y) / CELL_SIZE;
  return {
    dx: Math.round(fx - bounds.w / 2) - bounds.x,
    dy: Math.round(fy - bounds.h / 2) - bounds.y,
  };
}

/**
 * The first free place for the copied rooms next to where they were copied:
 * to the right, else below. A place inside the game's screen is preferred;
 * `undefined` when there is none within {@link SEARCH_CELLS} cells.
 */
export function freeOffsetNextTo(ship: Ship, clip: RoomsClip): Offset | undefined {
  const bounds = roomsBoundsCells({ rooms: clip.rooms.map((r, id) => ({ ...r, id })) })!;
  const candidates: Offset[] = [];
  for (let k = 0; k < SEARCH_CELLS; k++) candidates.push({ dx: bounds.w + k, dy: 0 });
  for (let k = 0; k < SEARCH_CELLS; k++) candidates.push({ dx: 0, dy: bounds.h + k });
  const area = roomArea(ship);
  const visible = (o: Offset) =>
    !area || shiftedClip(clip, o).every((r) => !beyondBottomRight(area, r));
  const free = candidates.filter((o) => !pasteProblem(ship, clip, o));
  return free.find(visible) ?? free[0];
}

export type RoomsPasteResult =
  | { ship: Ship; ids: number[]; leftOut: string[]; problem?: undefined }
  | { ship?: undefined; problem: PlaceProblem };

/**
 * Adds the copied rooms shifted by whole cells, with their doors where
 * their walls allow (see above; a door already there is not doubled) and
 * their systems in the new rooms. Door room ids follow the walls. The new rooms get the next ids; a system
 * the ship already has is left out and named in `leftOut`.
 */
export function pasteRooms(ship: Ship, clip: RoomsClip, offset: Offset): RoomsPasteResult {
  const problem = pasteProblem(ship, clip, offset);
  if (problem) return { problem };
  const first = ship.layout.rooms.length;
  let next = ship;
  for (const rect of shiftedClip(clip, offset)) next = addRoom(next, rect);
  const ids = clip.rooms.map((_, i) => first + i);
  for (const door of clip.doors) {
    const wall = { x: door.x + offset.dx, y: door.y + offset.dy, vertical: door.vertical };
    const sides = doorSides(next.layout, wall);
    const pasted = sides.filter((id) => ids.includes(id)).length;
    const fits = door.outer
      ? pasted === 1 && sides.every((id) => id !== -1)
      : sides.every((id) => id === -1 || ids.includes(id));
    if (pasted > 0 && fits && isDoorWall(next.layout, wall) && doorAt(next.layout, wall) === -1)
      next = addDoor(next, wall);
  }
  const leftOut: string[] = [];
  for (const system of clip.systems) {
    if (ship.blueprint.systems.some((s) => s.system === system.system)) {
      leftOut.push(system.system);
      continue;
    }
    next = addSystem(next, { ...system, room: ids[system.room] });
  }
  return { ship: syncDoorRooms(next), ids, leftOut };
}

// ---------------------------------------------------------------------------
// Mounts and gibs

/** The selected mounts and gibs; `undefined` when none is selected. */
export function copyArt(snapshot: ShipSnapshot, selection: Selection): ArtClip | undefined {
  const xml = snapshot.ship.layoutXml;
  const mounts = [...selection.mounts]
    .sort((a, b) => a - b)
    .filter((i) => xml.mounts[i])
    .map((i) => xml.mounts[i]);
  const gibs = [...selection.gibs]
    .sort((a, b) => a - b)
    .filter((i) => xml.gibs[i])
    .map((i) => ({ number: i + 1, gib: xml.gibs[i], picture: snapshot.art.gibs[i] ?? null }));
  if (mounts.length + gibs.length === 0) return undefined;
  return { mounts, gibs, source: snapshot.art.source };
}

/**
 * True when a copied gib's picture can be shown in this ship: it has none,
 * it is a PNG file's bytes, or the ship reads game pictures from the same
 * place as the ship it was copied from.
 */
export function gibFits(
  snapshot: ShipSnapshot,
  clip: ArtClip,
  picture: PictureRef | null
): boolean {
  return picture === null || picture.kind === "file" || snapshot.art.source === clip.source;
}

/** The shift that puts the middle of the copied mounts and gibs under a hull pixel. */
export function artOffsetUnder(clip: ArtClip, hull: Point): Offset {
  const points = [...clip.mounts, ...clip.gibs.map((g) => g.gib)];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return { dx: Math.round(hull.x - cx), dy: Math.round(hull.y - cy) };
}

export type ArtPasteResult =
  | { snapshot: ShipSnapshot; mounts: number[]; gibs: number[]; skipped: number; full?: undefined }
  | { full: true };

/**
 * Adds the copied mounts and gibs shifted by whole hull pixels. A mount
 * keeps its rotate, mirror, slide and gib; when its gib is pasted too, it
 * flies off with the new copy. Refused when the mounts would be more than
 * eight; gibs whose picture does not fit this ship ({@link gibFits}) are
 * left out and counted.
 */
export function pasteArt(snapshot: ShipSnapshot, clip: ArtClip, offset: Offset): ArtPasteResult {
  const xml = snapshot.ship.layoutXml;
  if (xml.mounts.length + clip.mounts.length > MAX_MOUNTS) return { full: true };
  const pasted = clip.gibs.filter((g) => gibFits(snapshot, clip, g.picture));
  const firstGib = xml.gibs.length;
  const numbers = new Map(pasted.map((g, i) => [g.number, firstGib + i + 1]));
  const withGibs = appendGibs(
    snapshot,
    pasted.map((g) => ({
      gib: { ...g.gib, x: g.gib.x + offset.dx, y: g.gib.y + offset.dy },
      picture: g.picture,
    }))
  );
  const mounts = clip.mounts.map((m) => ({
    ...m,
    x: m.x + offset.dx,
    y: m.y + offset.dy,
    gib: numbers.get(m.gib) ?? m.gib,
  }));
  const ship = updateLayoutXml(withGibs.ship, {
    mounts: [...withGibs.ship.layoutXml.mounts, ...mounts],
  });
  return {
    snapshot: { ...withGibs, ship },
    mounts: mounts.map((_, i) => xml.mounts.length + i),
    gibs: pasted.map((_, i) => firstGib + i),
    skipped: clip.gibs.length - pasted.length,
  };
}
