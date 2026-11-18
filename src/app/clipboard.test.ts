import { beforeEach, describe, expect, it } from "vitest";
import { memorySource, type Mount, type Ship } from "../core";
import { en } from "../text/en";
import { openArtShip } from "../testing/artFixtures";
import { createFakePlatform } from "../testing/fakePlatform";
import { cellPx, openTestShip, pilot, shields, testShip } from "../testing/layoutFixtures";
import { copyRooms, freeOffsetNextTo, offsetUnder, pasteRooms } from "./clipboard";
import { placePasting } from "./clipboardActions";
import { runCommand, type CommandContext } from "./commands";
import { setGestureCancel } from "./gesture";
import { setCanvasPointer } from "./pointer";
import { EMPTY_SELECTION, selectionOf } from "./selection";
import { useEditor } from "./store";

const state = () => useEditor.getState();
const snap = () => state().doc!.history.present;
const ship = () => snap().ship;
const steps = () => state().doc!.history.past.length;
const context: CommandContext = { platform: createFakePlatform(), texts: en };
const run = (command: Parameters<typeof runCommand>[0]) => runCommand(command, context);

/** Rests the pointer on the canvas over a ship pixel (the camera starts at scale 1, no shift). */
/** A ship described by where things are, without room ids or the order of doors and systems. */
function byPlace(s: Ship) {
  const at = (id: number) => {
    const r = s.layout.rooms.find((room) => room.id === id);
    return r ? `${r.x},${r.y},${r.w},${r.h}` : "space";
  };
  const rooms = s.layout.rooms.map((r) => at(r.id)).sort();
  const doors = s.layout.doors
    .map((d) => `${d.x},${d.y},${d.vertical}:${[at(d.roomA), at(d.roomB)].sort().join("|")}`)
    .sort();
  const systems = s.blueprint.systems
    .map((sys) => JSON.stringify({ ...sys, room: at(sys.room) }))
    .sort();
  return { rooms, doors, systems };
}

const pointAt = (p: { x: number; y: number } | null) => setCanvasPointer(p);

beforeEach(() => {
  pointAt(null);
  setGestureCancel(null);
});

describe("Copying and pasting rooms", () => {
  it("copies rooms with every door on their walls", () => {
    const clip = copyRooms(testShip(), [0, 1])!;
    expect(clip.rooms).toEqual([
      { x: 0, y: 0, w: 2, h: 1 },
      { x: 2, y: 0, w: 2, h: 2 },
    ]);
    // The door between them and their airlocks, and the door to room 2 marked as outer.
    expect(clip.doors).toEqual([
      { x: 2, y: 0, vertical: true, outer: false },
      { x: 4, y: 0, vertical: true, outer: true },
      { x: 0, y: 0, vertical: true, outer: false },
      { x: 2, y: 2, vertical: false, outer: false },
    ]);
    expect(copyRooms(testShip(), [])).toBeUndefined();
  });

  it("pastes next to the originals with the door between them, leaving out a door to another room", () => {
    const s = testShip();
    const clip = copyRooms(s, [0, 1])!;
    // One cell further right than their width: room 2 is in the way at once.
    const offset = freeOffsetNextTo(s, clip)!;
    expect(offset).toEqual({ dx: 5, dy: 0 });
    const result = pasteRooms(s, clip, offset);
    if (result.problem) throw new Error(result.problem);
    expect(result.ids).toEqual([3, 4]);
    expect(result.ship.layout.rooms.slice(3)).toEqual([
      { id: 3, x: 5, y: 0, w: 2, h: 1 },
      { id: 4, x: 7, y: 0, w: 2, h: 2 },
    ]);
    // The airlock on the left of the first room would open into room 2: left out.
    expect(result.ship.layout.doors.slice(4)).toEqual([
      { x: 7, y: 0, roomA: 3, roomB: 4, vertical: true },
      { x: 7, y: 2, roomA: 4, roomB: -1, vertical: false },
    ]);
    expect(pasteRooms(s, clip, { dx: 1, dy: 0 }).problem).toBe("overlap");
  });

  it("looks below when there is no free place to the right", () => {
    const s = testShip();
    const clip = copyRooms(s, [2])!;
    const walled = {
      ...s,
      layout: {
        ...s.layout,
        rooms: [...s.layout.rooms, { id: 3, x: 5, y: 0, w: 60, h: 1 }],
      },
    };
    expect(freeOffsetNextTo(walled, clip)).toEqual({ dx: 0, dy: 1 });
  });

  it("puts the middle of the rooms under the pointer", () => {
    const clip = copyRooms(testShip(), [0, 1])!;
    expect(offsetUnder(testShip(), clip, cellPx(10.5, 5))).toEqual({ dx: 9, dy: 4 });
  });

  it("lets pasted rooms follow the pointer until a click places them, one undo step", () => {
    openTestShip([pilot]);
    state().select(selectionOf({ kind: "room", id: 0 }, { kind: "room", id: 1 }));
    expect(run("copy")).toBe(true);
    expect(state().notice?.text).toBe(en.clipboard.copied(en.clipboard.rooms(2, 1, 4)));
    pointAt(cellPx(10.5, 5));
    expect(run("paste")).toBe(true);
    expect(state().pasting?.offset).toEqual({ dx: 9, dy: 4 });
    expect(steps()).toBe(0);
    expect(placePasting(en)).toBeUndefined();
    expect(ship().layout.rooms.slice(3)).toEqual([
      { id: 3, x: 9, y: 4, w: 2, h: 1 },
      { id: 4, x: 11, y: 4, w: 2, h: 2 },
    ]);
    // The ship has piloting already: the copy goes without it, and the notice says so.
    expect(ship().blueprint.systems.map((s) => s.room)).toEqual([1]);
    expect(state().notice?.text).toBe(en.clipboard.systemsLeftOut(["pilot"]));
    expect(state().selection).toEqual({ ...EMPTY_SELECTION, rooms: [3, 4] });
    expect(state().pasting).toBeNull();
    expect(steps()).toBe(1);
    state().undo();
    expect(ship().layout.rooms).toHaveLength(3);
  });

  it("keeps the rooms following after a refused click, and Esc stops without a change", () => {
    openTestShip();
    state().select(selectionOf({ kind: "room", id: 2 }));
    run("copy");
    pointAt(cellPx(0.5, 0.5));
    run("paste");
    expect(placePasting(en)).toBe("overlap");
    expect(state().pasting).not.toBeNull();
    expect(run("cancel")).toBe(true);
    expect(state().pasting).toBeNull();
    expect(state().selection.rooms).toEqual([2]);
    expect(steps()).toBe(0);
  });

  it("places pasted rooms next to the originals when the pointer is not on the canvas", () => {
    openTestShip();
    state().select(selectionOf({ kind: "room", id: 2 }));
    run("copy");
    expect(run("paste")).toBe(true);
    expect(state().pasting).toBeNull();
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: 5, y: 0, w: 1, h: 1 });
    expect(state().selection).toEqual({ ...EMPTY_SELECTION, rooms: [3] });
    expect(steps()).toBe(1);
  });

  it("duplicates in one go without changing the clipboard", () => {
    openTestShip();
    state().select(selectionOf({ kind: "room", id: 2 }));
    expect(run("duplicate")).toBe(true);
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: 5, y: 0, w: 1, h: 1 });
    expect(state().clipboard).toEqual({});
    expect(steps()).toBe(1);
    expect(run("paste")).toBe(false);
  });

  it("cuts rooms and pastes them again", () => {
    openTestShip();
    state().select(selectionOf({ kind: "room", id: 2 }));
    expect(run("cut")).toBe(true);
    expect(ship().layout.rooms).toHaveLength(2);
    expect(state().notice?.text).toBe(en.clipboard.cut(en.clipboard.rooms(1, 0, 1)));
    pointAt(cellPx(4.5, 0.5));
    run("paste");
    placePasting(en);
    expect(ship().layout.rooms[2]).toEqual({ id: 2, x: 4, y: 0, w: 1, h: 1 });
    expect(steps()).toBe(2);
  });

  it("cuts a room with its systems and pastes it back with all their data, one step each", () => {
    const fullPilot = { ...pilot, power: 2, start: true, max: 3, img: "room_pilot_2" };
    const medbay = { system: "medbay", power: 1, room: 2, slot: { number: 0 } };
    openTestShip([fullPilot, shields, medbay]);
    state().select(selectionOf({ kind: "room", id: 1 }));
    expect(run("cut")).toBe(true);
    expect(state().confirmation).toBeNull();
    expect(state().notice?.text).toBe(en.clipboard.cut(en.clipboard.rooms(1, 1, 3)));
    // Room 2 became room 1, and its system followed.
    expect(ship().blueprint.systems).toEqual([shields, { ...medbay, room: 1 }]);
    expect(steps()).toBe(1);
    expect(run("paste")).toBe(true);
    expect(ship().layout.rooms[2]).toEqual({ id: 2, x: 5, y: 0, w: 2, h: 2 });
    // Level, limit, start, interior and the crew station (cell and facing) come back, in the new room.
    expect(ship().blueprint.systems).toEqual([
      shields,
      { ...medbay, room: 1 },
      { ...fullPilot, room: 2 },
    ]);
    // The door that led to room 0 lands on the wall to room 1 (once room 2) and comes back there;
    // the one that led to room 2 would open to space and is left out.
    expect(ship().layout.doors.slice(-2)).toEqual([
      { x: 5, y: 0, roomA: 1, roomB: 2, vertical: true },
      { x: 5, y: 2, roomA: 2, roomB: -1, vertical: false },
    ]);
    expect(state().selection).toEqual({ ...EMPTY_SELECTION, rooms: [2] });
    expect(steps()).toBe(2);
  });

  it("gives back the same ship after cut and paste in the same place", () => {
    const original = openTestShip([pilot, shields, { system: "medbay", power: 1, room: 2 }]);
    state().select(selectionOf({ kind: "room", id: 1 }));
    run("cut");
    expect(ship().layout.doors).toHaveLength(1);
    pointAt(cellPx(3, 1));
    run("paste");
    expect(placePasting(en)).toBeUndefined();
    // The cut room comes back as the last room, so ids and orders differ; by place, all is the same.
    expect(byPlace(ship())).toEqual(byPlace(original));
    expect(ship().layout.doors).toHaveLength(4);
    expect(steps()).toBe(2);
  });

  it("duplicates a room without the systems the ship has, and names them", () => {
    openTestShip([pilot, shields]);
    state().select(selectionOf({ kind: "room", id: 0 }, { kind: "room", id: 1 }));
    run("duplicate");
    expect(ship().layout.rooms).toHaveLength(5);
    expect(ship().blueprint.systems).toEqual([pilot, shields]);
    expect(state().notice?.text).toBe(en.clipboard.systemsLeftOut(["pilot", "shields"]));
    expect(en.clipboard.systemsLeftOut(["Piloting"])).toBe(
      "Piloting is already on the ship, so the copy has no Piloting."
    );
    expect(steps()).toBe(1);
  });

  it("brings the systems into another ship that lacks them", () => {
    openTestShip([pilot, shields]);
    state().select(selectionOf({ kind: "room", id: 1 }));
    run("copy");
    state().openDocument({
      ship: { ...testShip([shields]), layout: { ...testShip().layout, rooms: [], doors: [] } },
      art: { source: memorySource({}), gibs: [] },
      saved: true,
      start: { workspace: "rooms" },
    });
    run("paste");
    expect(ship().blueprint.systems).toEqual([shields, { ...pilot, room: 0 }]);
    // No system left out: the notice is still the one from copying.
    expect(state().notice?.text).toBe(en.clipboard.copied(en.clipboard.rooms(1, 1, 3)));
    expect(steps()).toBe(1);
  });

  it("keeps the clipboard for another ship opened in the same run", () => {
    openTestShip();
    state().select(selectionOf({ kind: "room", id: 1 }));
    run("copy");
    state().openDocument({
      ship: { ...testShip(), layout: { ...testShip().layout, rooms: [], doors: [] } },
      art: { source: memorySource({}), gibs: [] },
      saved: true,
      start: { workspace: "rooms" },
    });
    expect(run("paste")).toBe(true);
    expect(ship().layout.rooms).toEqual([{ id: 0, x: 4, y: 0, w: 2, h: 2 }]);
    // Its airlock below comes along.
    expect(ship().layout.doors).toEqual([{ x: 2 + 2, y: 2, roomA: 0, roomB: -1, vertical: false }]);
  });

  it("does nothing without rooms selected or copied, and outside Rooms and Hull", () => {
    openTestShip();
    expect(run("copy")).toBe(false);
    expect(run("paste")).toBe(false);
    expect(run("duplicate")).toBe(false);
    state().select(selectionOf({ kind: "door", index: 0 }));
    expect(run("cut")).toBe(false);
    state().select(selectionOf({ kind: "room", id: 0 }));
    state().setWorkspace("ship");
    expect(run("copy")).toBe(false);
    expect(steps()).toBe(0);
  });
});

describe("Copying and pasting mounts and gibs", () => {
  const mount: Mount = { x: 40, y: 40, rotate: true, mirror: false, gib: 2, slide: "down" };
  const xml = () => ship().layoutXml;

  beforeEach(() => {
    openArtShip([mount]);
    state().setWorkspace("hull");
  });

  it("pastes a copy a few pixels off, with the same settings and a gib copied with it", () => {
    state().select(selectionOf({ kind: "mount", index: 0 }, { kind: "gib", index: 1 }));
    expect(run("copy")).toBe(true);
    expect(state().notice?.text).toBe(en.clipboard.copied(en.clipboard.art(1, 1)));
    expect(run("paste")).toBe(true);
    expect(xml().mounts[1]).toEqual({ ...mount, x: 50, y: 50, gib: 3 });
    expect(xml().gibs[2]).toMatchObject({ x: 110, y: 10, direction: { min: 180, max: 270 } });
    expect(snap().art.gibs[2]).toEqual(snap().art.gibs[1]);
    expect(state().selection).toEqual({ ...EMPTY_SELECTION, mounts: [1], gibs: [2] });
    expect(steps()).toBe(1);
  });

  it("pastes under the pointer", () => {
    state().select(selectionOf({ kind: "mount", index: 0 }));
    run("copy");
    // The hull picture's corner is ship pixel (25, 15).
    pointAt({ x: 125, y: 115 });
    run("paste");
    expect(xml().mounts[1]).toEqual({ ...mount, x: 100, y: 100 });
  });

  it("duplicates a few pixels off even with the pointer on the canvas", () => {
    state().select(selectionOf({ kind: "mount", index: 0 }));
    pointAt({ x: 125, y: 115 });
    expect(run("duplicate")).toBe(true);
    expect(xml().mounts[1]).toEqual({ ...mount, x: 50, y: 50 });
    expect(state().clipboard).toEqual({});
    expect(steps()).toBe(1);
  });

  it("cuts a mount", () => {
    state().select(selectionOf({ kind: "mount", index: 0 }));
    expect(run("cut")).toBe(true);
    expect(xml().mounts).toEqual([]);
    run("paste");
    expect(xml().mounts).toEqual([{ ...mount, x: 50, y: 50 }]);
    expect(steps()).toBe(2);
  });

  it("refuses more than eight mounts", () => {
    state().edit((s) => ({
      ...s,
      layoutXml: { ...s.layoutXml, mounts: Array.from({ length: 8 }, () => mount) },
    }));
    state().select(selectionOf({ kind: "mount", index: 0 }));
    run("duplicate");
    expect(xml().mounts).toHaveLength(8);
    expect(state().notice?.text).toBe(en.art.mountProblems.full);
    expect(steps()).toBe(1);
  });

  it("leaves out gibs whose game picture another ship cannot read", () => {
    state().select(selectionOf({ kind: "mount", index: 0 }, { kind: "gib", index: 1 }));
    run("copy");
    const other = snap();
    state().openDocument({
      ship: other.ship,
      art: { ...other.art, source: memorySource({}) },
      saved: true,
      start: { workspace: "hull" },
    });
    run("paste");
    expect(xml().gibs).toHaveLength(2);
    expect(xml().mounts[1]).toEqual({ ...mount, x: 50, y: 50, gib: 2 });
    expect(state().notice?.text).toBe(en.clipboard.gibsLeftOut(1));
  });
});
