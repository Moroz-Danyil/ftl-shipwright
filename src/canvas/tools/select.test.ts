import { beforeEach, describe, expect, it } from "vitest";
import { addMount, type Mount, type Point } from "../../core";
import { setGestureCancel } from "../../app/gesture";
import { EMPTY_SELECTION, selectionOf, workspaceFor } from "../../app/selection";
import { PICTURES_SECTION, undoAvailable, useEditor } from "../../app/store";
import { WORKSPACES, type WorkspaceId } from "../../app/workspaces";
import { en } from "../../text/en";
import { openArtShip } from "../../testing/artFixtures";
import { cellPx } from "../../testing/layoutFixtures";
import { targetAt } from "./selectTool";
import type { CanvasTool, Overlay, ToolContext } from "./types";
import { createTool } from "./useCanvasTool";

/*
 * The art test ship: rooms 0 (35..105, 35..70), 1 (105..175, 35..105) and
 * 2 (175..210, 35..70) in ship pixels; the hull picture from (25, 15),
 * 200 × 100; gib 1 from (125, 15) (one cell while its picture is not read).
 */
const state = () => useEditor.getState();
const snap = () => state().doc!.history.present;
const xml = () => snap().ship.layoutXml;
const steps = () => state().doc!.history.past.length;

/** A mount at hull (100, 80): ship (125, 95), over room 1. */
const MOUNT: Mount = { x: 100, y: 80, rotate: false, mirror: false, gib: 0 };
const ON_MOUNT = { x: 125, y: 95 };
/** Over gib 1 and room 1. */
const ON_GIB = { x: 140, y: 45 };
const ON_ROOM_2 = cellPx(4.5, 0.5);
/** The hull picture where no room, door, mount or gib is. */
const ON_HULL = { x: 40, y: 100 };

let overlay: Overlay | null;
let said: string[];
const context: ToolContext = {
  texts: en,
  setOverlay: (o) => (overlay = o),
  setGesture: setGestureCancel,
  say: (t) => said.push(t),
};

const at = (p: Point, shift = false) => ({ p, shift, scale: 1 });

function selectIn(workspace: WorkspaceId): CanvasTool {
  state().setWorkspace(workspace);
  return createTool("select", context, workspace);
}

function drag(tool: CanvasTool, from: Point, to: Point, shift = false) {
  tool.down(at(from, shift));
  tool.move(at({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, shift));
  tool.move(at(to, shift));
  tool.up(at(to, shift));
}

function click(tool: CanvasTool, p: Point, shift = false) {
  tool.down(at(p, shift));
  tool.up(at(p, shift));
}

beforeEach(() => {
  overlay = null;
  said = [];
  setGestureCancel(null);
  openArtShip([MOUNT]);
});

describe("Select in every workspace", () => {
  it.each(WORKSPACES)("in %s, drags a mount at once and opens Hull with it selected", (ws) => {
    const tool = selectIn(ws);
    drag(tool, ON_MOUNT, { x: 135, y: 92 });
    expect(xml().mounts[0]).toMatchObject({ x: 110, y: 77 });
    expect(steps()).toBe(1);
    expect(state().selection).toEqual(selectionOf({ kind: "mount", index: 0 }));
    expect(state().workspace).toBe("hull");
    expect(state().tools.hull).toBe("select");
  });

  it.each(WORKSPACES)("in %s, drags a shown gib and opens Hull", (ws) => {
    state().setLayer("gibs", true);
    const tool = selectIn(ws);
    drag(tool, ON_GIB, { x: 143, y: 49 });
    expect(xml().gibs[1]).toMatchObject({ x: 103, y: 4 });
    expect(steps()).toBe(1);
    expect(state().selection.gibs).toEqual([1]);
    expect(state().workspace).toBe("hull");
  });

  it.each(WORKSPACES)("in %s, drags a room by whole cells and opens Rooms", (ws) => {
    const tool = selectIn(ws);
    drag(tool, ON_ROOM_2, cellPx(4.6, 2.8));
    expect(snap().ship.layout.rooms[2]).toMatchObject({ x: 4, y: 2 });
    expect(steps()).toBe(1);
    expect(state().selection).toEqual(selectionOf({ kind: "room", id: 2 }));
    expect(state().workspace).toBe("rooms");
    state().undo();
    expect(snap().ship.layout.rooms[2]).toMatchObject({ x: 4, y: 0 });
  });

  it.each(WORKSPACES)(
    "in %s, drags the hull picture with the mounts and opens Hull's Pictures",
    (ws) => {
      const tool = selectIn(ws);
      drag(tool, ON_HULL, { x: 45, y: 97 });
      expect(xml().img).toMatchObject({ x: -5, y: -23 });
      // The mounts and gibs are placed on the hull, so they come along.
      expect(xml().mounts[0]).toMatchObject({ x: 100, y: 80 });
      expect(steps()).toBe(1);
      expect(state().selection).toEqual(selectionOf({ kind: "hullPicture" }));
      expect(state().workspace).toBe("hull");
      expect(state().openSections[PICTURES_SECTION]).toBe(true);
    }
  );

  it("moves the hull picture as the Move picture tool does when the mounts stay", () => {
    state().setArtTool({ keepMounts: true });
    drag(selectIn("rooms"), ON_HULL, { x: 45, y: 100 });
    expect(xml().img).toMatchObject({ x: -5, y: -20 });
    expect(xml().mounts[0]).toMatchObject({ x: 95, y: 80 });
    expect(state().artTool.active).toBe("hull");
  });

  it("keeps the workspace when the thing belongs to it", () => {
    const tool = selectIn("hull");
    click(tool, ON_MOUNT);
    expect(state().workspace).toBe("hull");
    state().setTool("mount");
    const rooms = selectIn("rooms");
    click(rooms, ON_ROOM_2);
    expect(state().workspace).toBe("rooms");
    // Going to Hull with a click picks its Select tool.
    click(rooms, ON_MOUNT);
    expect(state().workspace).toBe("hull");
    expect(state().tools.hull).toBe("select");
  });

  it("does not switch while the drag goes on, nor after Esc", () => {
    const tool = selectIn("rooms");
    tool.down(at(ON_MOUNT));
    tool.move(at({ x: 140, y: 95 }));
    expect(overlay).toMatchObject({ kind: "artGhost" });
    expect(state().workspace).toBe("rooms");
    tool.cancel();
    tool.up(at({ x: 140, y: 95 }));
    expect(state().workspace).toBe("rooms");
    expect(undoAvailable(state())).toBe(false);
  });

  it("opens Rooms for a door and a station clicked in Ship", () => {
    const tool = selectIn("ship");
    click(tool, cellPx(2, 0.5));
    expect(state().selection).toEqual(selectionOf({ kind: "door", index: 0 }));
    expect(state().workspace).toBe("rooms");
  });

  it("clears the selection on empty canvas and stays", () => {
    const tool = selectIn("ship");
    state().select(selectionOf({ kind: "mount", index: 0 }));
    click(tool, { x: 400, y: 400 });
    expect(state().selection).toEqual(EMPTY_SELECTION);
    expect(state().workspace).toBe("ship");
  });
});

describe("what Select picks where things overlap", () => {
  const pick = (p: Point) => targetAt(snap().ship, snap().art, at(p));

  it("takes a mount, a gib, a door, a room, then the hull picture", () => {
    state().setLayer("gibs", true);
    expect(pick(ON_MOUNT)).toEqual({ kind: "mount", index: 0 });
    expect(pick(ON_GIB)).toEqual({ kind: "gib", index: 1 });
    expect(pick(cellPx(1.95, 0.5))).toEqual({ kind: "door", index: 0 });
    expect(pick(cellPx(3.5, 0.8))).toEqual({ kind: "room", id: 1 });
    expect(pick(ON_HULL)).toEqual({ kind: "hullPicture" });
    expect(pick({ x: 400, y: 400 })).toBeUndefined();
  });

  it("leaves out what is not drawn", () => {
    state().setWorkspace("rooms");
    expect(pick(ON_GIB)).toEqual({ kind: "room", id: 1 });
    state().setLayer("mounts", false);
    expect(pick(ON_MOUNT)).toEqual({ kind: "room", id: 1 });
    // Ship draws the mounts whatever the layer says.
    state().setWorkspace("ship");
    expect(pick(ON_MOUNT)).toEqual({ kind: "mount", index: 0 });
    state().setLayer("doors", false);
    expect(pick(cellPx(1.95, 0.5))).toEqual({ kind: "room", id: 0 });
    state().setLayer("rooms", false);
    expect(pick(cellPx(3.5, 0.8))).toEqual({ kind: "hullPicture" });
    state().setLayer("hull", false);
    expect(pick(ON_HULL)).toBeUndefined();
  });

  it("gives the selected room's resize handles in Rooms the first say", () => {
    const tool = selectIn("rooms");
    state().select(selectionOf({ kind: "room", id: 1 }));
    // The bottom edge of room 1 (y 105), within the reach of a mount there.
    state().edit((s) => addMount(s, { ...MOUNT, x: 135, y: 88 }));
    expect(pick({ x: 160, y: 104 })).toEqual({ kind: "mount", index: 1 });
    drag(tool, { x: 160, y: 104 }, { x: 160, y: 140 });
    expect(snap().ship.layout.rooms[1]).toMatchObject({ h: 3 });
    expect(xml().mounts[1]).toMatchObject({ x: 135, y: 88 });
  });
});

describe("a mixed selection", () => {
  it("is made with Shift+click and keeps the workspace that edits part of it", () => {
    const tool = selectIn("rooms");
    click(tool, ON_ROOM_2);
    click(tool, ON_MOUNT, true);
    expect(state().selection).toEqual(
      selectionOf({ kind: "room", id: 2 }, { kind: "mount", index: 0 })
    );
    expect(state().workspace).toBe("rooms");
    click(tool, ON_HULL, true);
    expect(state().selection.hullPicture).toBe(true);
    click(tool, ON_HULL, true);
    expect(state().selection.hullPicture).toBe(false);
  });

  it("is made with a box, which leaves the hull picture out", () => {
    state().setLayer("gibs", true);
    const tool = selectIn("hull");
    drag(tool, { x: 100, y: 0 }, { x: 240, y: 112 });
    expect(state().selection).toEqual({
      ...EMPTY_SELECTION,
      rooms: [1, 2],
      doors: [0, 1, 3],
      mounts: [0],
      gibs: [1],
    });
    expect(state().workspace).toBe("hull");
  });

  it("is boxed over the hull picture with Shift, which adds", () => {
    const tool = selectIn("rooms");
    click(tool, ON_ROOM_2);
    drag(tool, { x: 100, y: 30 }, { x: 180, y: 110 }, true);
    expect(snap().ship.layoutXml.img).toMatchObject({ x: -10, y: -20 });
    expect(state().selection.rooms).toEqual([1, 2]);
    expect(state().selection.mounts).toEqual([0]);
  });

  it("opens the workspace of its first kind when the current one edits none of it", () => {
    const both = selectionOf({ kind: "room", id: 0 }, { kind: "mount", index: 0 });
    expect(workspaceFor(both, "ship")).toBe("rooms");
    expect(workspaceFor(both, "hull")).toBe("hull");
    expect(workspaceFor(selectionOf({ kind: "weapon", index: 0 }), "rooms")).toBe("ship");
    expect(workspaceFor(EMPTY_SELECTION, "hull")).toBe("hull");
    const tool = selectIn("ship");
    drag(tool, { x: 100, y: 0 }, { x: 180, y: 110 });
    expect(state().workspace).toBe("rooms");
  });

  it("moves together by whole cells when rooms are in it", () => {
    state().setLayer("gibs", true);
    state().select({ ...EMPTY_SELECTION, rooms: [2], mounts: [0], gibs: [1] });
    const tool = selectIn("hull");
    drag(tool, ON_MOUNT, { x: 128, y: 128 });
    expect(snap().ship.layout.rooms[2]).toMatchObject({ x: 4, y: 1 });
    expect(xml().mounts[0]).toMatchObject({ x: 100, y: 115 });
    expect(xml().gibs[1]).toMatchObject({ x: 100, y: 35 });
    expect(steps()).toBe(1);
    expect(state().workspace).toBe("hull");
    state().undo();
    expect(xml().mounts[0]).toEqual(MOUNT);
    expect(snap().ship.layout.rooms[2]).toMatchObject({ x: 4, y: 0 });
  });

  it("shows the rooms, mounts, gibs and hull picture in one ghost", () => {
    state().select({ ...EMPTY_SELECTION, rooms: [2], mounts: [0], hullPicture: true });
    const tool = selectIn("rooms");
    tool.down(at(ON_ROOM_2));
    tool.move(at({ x: ON_ROOM_2.x, y: ON_ROOM_2.y + 36 }));
    expect(overlay).toEqual({
      kind: "ghost",
      cells: [{ id: 2, x: 4, y: 1, w: 1, h: 1 }],
      ok: true,
      mounts: [{ x: 125, y: 130 }],
      gibs: [],
      outline: { x: 25, y: 50, w: 200, h: 100 },
    });
    tool.up(at({ x: ON_ROOM_2.x, y: ON_ROOM_2.y + 36 }));
    // The mount rides on the hull picture: one cell down, not two.
    expect(xml().img).toMatchObject({ x: -10, y: 15 });
    expect(xml().mounts[0]).toEqual(MOUNT);
    expect(snap().ship.layout.rooms[2]).toMatchObject({ y: 1 });
    expect(steps()).toBe(1);
  });

  it("moves by pixels without rooms", () => {
    state().setLayer("gibs", true);
    state().select({ ...EMPTY_SELECTION, mounts: [0], gibs: [1] });
    drag(selectIn("rooms"), ON_GIB, { x: 147, y: 43 });
    expect(xml().mounts[0]).toMatchObject({ x: 107, y: 78 });
    expect(xml().gibs[1]).toMatchObject({ x: 107, y: -2 });
    expect(steps()).toBe(1);
  });

  it("changes nothing when the rooms cannot go there", () => {
    state().select({ ...EMPTY_SELECTION, rooms: [2], mounts: [0] });
    const tool = selectIn("rooms");
    tool.down(at(ON_MOUNT));
    tool.move(at({ x: 90, y: 95 }));
    tool.move(at({ x: 55, y: 95 }));
    expect(overlay).toMatchObject({ kind: "ghost", ok: false });
    tool.up(at({ x: 55, y: 95 }));
    expect(undoAvailable(state())).toBe(false);
    expect(xml().mounts[0]).toEqual(MOUNT);
    expect(said).toEqual([en.layout.problems.overlap]);
  });
});
