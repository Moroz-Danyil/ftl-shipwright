import { beforeEach, describe, expect, it } from "vitest";
import { cancelGesture, setGestureCancel } from "../../app/gesture";
import { changeRoom, resizeRoom } from "../../app/layout/rooms";
import { selectionOf } from "../../app/selection";
import { undoAvailable, useEditor } from "../../app/store";
import type { Point, Ship } from "../../core";
import { en } from "../../text/en";
import { cellPx, openTestShip, pilot } from "../../testing/layoutFixtures";
import { handleAt, resizedRect } from "../resizeHandles";
import { resizableRoom, withRoomResize } from "./resizeTool";
import { createSelectTool } from "./selectTool";
import type { CanvasTool, Overlay, ToolContext } from "./types";

const state = () => useEditor.getState();
const ship = (): Ship => state().doc!.history.present.ship;
const steps = () => state().doc!.history.past.length;
const room = (id: number) => ship().layout.rooms[id];

let overlay: Overlay | null;
let said: string[];
let cursor: string | null;
const context: ToolContext = {
  texts: en,
  setOverlay: (o) => (overlay = o),
  setGesture: setGestureCancel,
  say: (t) => said.push(t),
  setCursor: (c) => (cursor = c),
};

const at = (cx: number, cy: number) => ({ p: cellPx(cx, cy), shift: false, scale: 1 });

function drag(tool: CanvasTool, from: Point, to: Point) {
  tool.down(at(from.x, from.y));
  tool.move(at((from.x + to.x) / 2, (from.y + to.y) / 2));
  tool.move(at(to.x, to.y));
}

/** Selects a room, drags from one cell point to another and lets go. */
function resize(id: number, from: Point, to: Point): CanvasTool {
  const tool = withRoomResize(createSelectTool(context), context);
  state().select(selectionOf({ kind: "room", id }));
  drag(tool, from, to);
  tool.up(at(to.x, to.y));
  return tool;
}

beforeEach(() => {
  overlay = null;
  said = [];
  cursor = null;
  setGestureCancel(null);
});

describe("Resize handles", () => {
  it("finds the edge and corner handles at a fixed screen distance", () => {
    const r = { x: 0, y: 0, w: 70, h: 35 };
    expect(handleAt(r, { x: 0, y: 17 }, 1)).toBe("w");
    expect(handleAt(r, { x: 72, y: 17 }, 1)).toBe("e");
    expect(handleAt(r, { x: 35, y: -5 }, 1)).toBe("n");
    expect(handleAt(r, { x: 35, y: 37 }, 1)).toBe("s");
    expect(handleAt(r, { x: -3, y: -3 }, 1)).toBe("nw");
    expect(handleAt(r, { x: 70, y: 35 }, 1)).toBe("se");
    expect(handleAt(r, { x: 71, y: -2 }, 1)).toBe("ne");
    expect(handleAt(r, { x: 1, y: 34 }, 1)).toBe("sw");
    // The middle stays free for moving the room, and far away is nothing.
    expect(handleAt(r, { x: 35, y: 17 }, 1)).toBeUndefined();
    expect(handleAt(r, { x: -20, y: 17 }, 1)).toBeUndefined();
    // Zoomed out, the reach in ship pixels grows outside but not into a small room.
    expect(handleAt(r, { x: -20, y: 17 }, 0.25)).toBe("w");
    expect(handleAt({ x: 0, y: 0, w: 35, h: 35 }, { x: 17, y: 17 }, 0.25)).toBeUndefined();
    expect(handleAt({ x: 0, y: 0, w: 35, h: 35 }, { x: 10, y: 17 }, 0.25)).toBeUndefined();
  });

  it("resizes by whole cells and never below one cell", () => {
    const r = { x: 2, y: 3, w: 3, h: 2 };
    expect(resizedRect(r, "e", 2, 9)).toEqual({ x: 2, y: 3, w: 5, h: 2 });
    expect(resizedRect(r, "w", -1, 0)).toEqual({ x: 1, y: 3, w: 4, h: 2 });
    expect(resizedRect(r, "w", 5, 0)).toEqual({ x: 4, y: 3, w: 1, h: 2 });
    expect(resizedRect(r, "n", 0, -2)).toEqual({ x: 2, y: 1, w: 3, h: 4 });
    expect(resizedRect(r, "s", 0, -4)).toEqual({ x: 2, y: 3, w: 3, h: 1 });
    expect(resizedRect(r, "se", 1, 1)).toEqual({ x: 2, y: 3, w: 4, h: 3 });
    expect(resizedRect(r, "nw", 1, 1)).toEqual({ x: 3, y: 4, w: 2, h: 1 });
  });

  it("shows only on the one selected room, in Rooms with the Select tool", () => {
    openTestShip();
    expect(resizableRoom(state())).toBeUndefined();
    state().select(selectionOf({ kind: "room", id: 2 }));
    expect(resizableRoom(state())).toEqual(room(2));
    state().select(selectionOf({ kind: "room", id: 1 }, { kind: "room", id: 2 }));
    expect(resizableRoom(state())).toBeUndefined();
    state().select(selectionOf({ kind: "room", id: 2 }));
    state().setTool("room");
    expect(resizableRoom(state())).toBeUndefined();
    state().setTool("select");
    state().setWorkspace("hull");
    expect(resizableRoom(state())).toBeUndefined();
  });
});

describe("Resizing a room on the canvas", () => {
  beforeEach(() => openTestShip([pilot]));

  it("grows a room with each edge handle", () => {
    resize(2, { x: 5, y: 0.5 }, { x: 7, y: 0.5 });
    expect(room(2)).toEqual({ id: 2, x: 4, y: 0, w: 3, h: 1 });
    resize(2, { x: 5.5, y: 1 }, { x: 5.5, y: 3 });
    expect(room(2)).toEqual({ id: 2, x: 4, y: 0, w: 3, h: 3 });
    resize(2, { x: 5.5, y: 0 }, { x: 5.5, y: -1 });
    expect(room(2)).toEqual({ id: 2, x: 4, y: -1, w: 3, h: 4 });
    resize(0, { x: 0, y: 0.95 }, { x: -1, y: 0.95 });
    expect(room(0)).toEqual({ id: 0, x: -1, y: 0, w: 3, h: 1 });
    expect(said).toEqual([]);
  });

  it("shrinks a room with each edge handle", () => {
    resize(1, { x: 3.5, y: 2 }, { x: 3.5, y: 1 });
    expect(room(1)).toEqual({ id: 1, x: 2, y: 0, w: 2, h: 1 });
    state().edit((s) => resizeRoom(s, 2, { x: 4, y: 0, w: 3, h: 3 }).ship!);
    resize(2, { x: 7, y: 1.5 }, { x: 6, y: 1.5 });
    expect(room(2)).toEqual({ id: 2, x: 4, y: 0, w: 2, h: 3 });
    resize(2, { x: 5, y: 3 }, { x: 5, y: 2 });
    expect(room(2)).toEqual({ id: 2, x: 4, y: 0, w: 2, h: 2 });
    resize(2, { x: 4, y: 1.5 }, { x: 5, y: 1.5 });
    expect(room(2)).toEqual({ id: 2, x: 5, y: 0, w: 1, h: 2 });
    resize(2, { x: 5.5, y: 0 }, { x: 5.5, y: 1 });
    expect(room(2)).toEqual({ id: 2, x: 5, y: 1, w: 1, h: 1 });
  });

  it("grows and shrinks a room with the corner handles", () => {
    resize(2, { x: 5, y: 1 }, { x: 6, y: 2 });
    expect(room(2)).toEqual({ id: 2, x: 4, y: 0, w: 2, h: 2 });
    resize(2, { x: 6, y: 0 }, { x: 7, y: -1 });
    expect(room(2)).toEqual({ id: 2, x: 4, y: -1, w: 3, h: 3 });
    resize(2, { x: 4, y: -1 }, { x: 5, y: 0 });
    expect(room(2)).toEqual({ id: 2, x: 5, y: 0, w: 2, h: 2 });
    resize(2, { x: 5, y: 2 }, { x: 6, y: 1 });
    expect(room(2)).toEqual({ id: 2, x: 6, y: 0, w: 1, h: 1 });
  });

  it("shows the new size in a ghost and the resize pointer, one undo step", () => {
    const tool = withRoomResize(createSelectTool(context), context);
    state().select(selectionOf({ kind: "room", id: 2 }));
    tool.move(at(5, 1));
    expect(cursor).toBe("nwse-resize");
    tool.move(at(4.5, 0.5));
    expect(cursor).toBeNull();
    drag(tool, { x: 5, y: 1 }, { x: 7, y: 2 });
    expect(overlay).toEqual({
      kind: "ghost",
      cells: [{ x: 4, y: 0, w: 3, h: 2 }],
      ok: true,
      size: true,
    });
    expect(cursor).toBe("nwse-resize");
    tool.up(at(7, 2));
    expect(overlay).toBeNull();
    expect(steps()).toBe(1);
    state().undo();
    expect(room(2)).toEqual({ id: 2, x: 4, y: 0, w: 1, h: 1 });
  });

  it("refuses an overlap or a room above the frame in red, and changes nothing", () => {
    const tool = withRoomResize(createSelectTool(context), context);
    state().select(selectionOf({ kind: "room", id: 0 }));
    drag(tool, { x: 2, y: 1 }, { x: 3, y: 1 });
    expect(overlay).toMatchObject({ kind: "ghost", ok: false });
    tool.up(at(3, 1));
    expect(said).toEqual([en.layout.problems.overlap]);
    // The frame's top edge is cell row -1.
    state().select(selectionOf({ kind: "room", id: 2 }));
    drag(tool, { x: 4.5, y: 0 }, { x: 4.5, y: -2 });
    expect(overlay).toMatchObject({ kind: "ghost", ok: false });
    tool.up(at(4.5, -2));
    expect(said).toEqual([en.layout.problems.overlap, en.layout.problems.offScreen]);
    expect(undoAvailable(state())).toBe(false);
  });

  it("resizes past the frame's right edge and says it will not be visible in battle", () => {
    resize(2, { x: 5, y: 0.5 }, { x: 19, y: 0.5 });
    expect(room(2)).toEqual({ id: 2, x: 4, y: 0, w: 15, h: 1 });
    expect(said).toEqual([]);
    expect(state().notice).toEqual({ kind: "info", text: en.layout.outOfView });
  });

  it("cancels with Esc without a step", () => {
    const tool = withRoomResize(createSelectTool(context), context);
    state().select(selectionOf({ kind: "room", id: 2 }));
    drag(tool, { x: 5, y: 0.5 }, { x: 8, y: 0.5 });
    expect(cancelGesture()).toBe(true);
    expect(overlay).toBeNull();
    tool.up(at(8, 0.5));
    expect(undoAvailable(state())).toBe(false);
  });

  it("still moves the room by its middle and leaves doors on an edge to the Select tool", () => {
    const tool = withRoomResize(createSelectTool(context), context);
    state().select(selectionOf({ kind: "room", id: 2 }));
    drag(tool, { x: 4.5, y: 0.5 }, { x: 4.5, y: 2.5 });
    tool.up(at(4.5, 2.5));
    expect(room(2)).toEqual({ id: 2, x: 4, y: 2, w: 1, h: 1 });
    // Door 0 sits on the west edge of room 1: a click there selects the door.
    state().select(selectionOf({ kind: "room", id: 1 }));
    tool.down(at(2, 0.5));
    tool.up(at(2, 0.5));
    expect(state().selection).toEqual(selectionOf({ kind: "door", index: 0 }));
  });

  it("keeps the doors where they are and the station on its cell", () => {
    // Growing room 1 over its airlock below puts the airlock inside the room: it goes.
    resize(1, { x: 3.5, y: 2 }, { x: 3.5, y: 3 });
    expect(room(1)).toEqual({ id: 1, x: 2, y: 0, w: 2, h: 3 });
    expect(ship().layout.doors).toHaveLength(3);
    expect(ship().blueprint.systems[0].slot?.number).toBe(1);
    // Shrinking it from the west: door 0 stays, now an airlock of room 0.
    resize(1, { x: 2, y: 1.5 }, { x: 3, y: 1.5 });
    expect(room(1)).toEqual({ id: 1, x: 3, y: 0, w: 1, h: 3 });
    expect(ship().layout.doors[0]).toEqual({ x: 2, y: 0, roomA: 0, roomB: -1, vertical: true });
    // The pilot's station stays on cell (3, 0): number 0 of the narrower room.
    expect(ship().blueprint.systems[0].slot).toEqual({ number: 0, direction: "right" });
    expect(ship().blueprint.systems[0].room).toBe(1);
    expect(steps()).toBe(2);
  });
});

describe("resizeRoom", () => {
  it("leaves a station that falls outside with its number, as the inspector does", () => {
    const ship = openTestShip([{ ...pilot, slot: { number: 3, direction: "down" } }]);
    const smaller = resizeRoom(ship, 1, { x: 2, y: 0, w: 2, h: 1 }).ship!;
    expect(smaller.blueprint.systems[0].slot).toEqual({ number: 3, direction: "down" });
    const wider = resizeRoom(ship, 1, { x: 2, y: 0, w: 3, h: 2 });
    expect(wider.problem).toBe("overlap");
    const same = resizeRoom(ship, 1, { x: 2, y: 0, w: 2, h: 2 });
    expect(same.ship).toBe(ship);
  });

  it("keeps a station on its cell when the inspector changes the width", () => {
    const ship = openTestShip([{ ...pilot, slot: { number: 2, direction: "left" } }]);
    // Cell (0, 1) of room 1 is number 2 at width 2 and number 1 at width 1.
    const narrow = changeRoom(ship, 1, { w: 1 }).ship!;
    expect(narrow.blueprint.systems[0].slot).toEqual({ number: 1, direction: "left" });
  });
});
