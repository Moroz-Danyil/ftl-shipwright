import { beforeEach, describe, expect, it } from "vitest";
import { cancelGesture, setGestureCancel } from "../../app/gesture";
import { EMPTY_SELECTION, selectionOf } from "../../app/selection";
import { undoAvailable, useEditor } from "../../app/store";
import type { Point, Ship } from "../../core";
import { en } from "../../text/en";
import { cellPx, openTestShip, pilot, shields } from "../../testing/layoutFixtures";
import { createDoorTool, createRoomTool, createStationTool, stationSystemFor } from "./placeTools";
import { boxBetween, cellOffset, createSelectTool, targetsInBox } from "./selectTool";
import type { CanvasTool, Overlay, ToolContext } from "./types";

const state = () => useEditor.getState();
const ship = (): Ship => state().doc!.history.present;
const steps = () => state().doc!.history.past.length;

let overlay: Overlay | null;
let said: string[];
const context: ToolContext = {
  texts: en,
  setOverlay: (o) => (overlay = o),
  setGesture: setGestureCancel,
  say: (t) => said.push(t),
};

const at = (cx: number, cy: number, shift = false) => ({ p: cellPx(cx, cy), shift, scale: 1 });

function drag(tool: CanvasTool, from: Point, to: Point, shift = false) {
  tool.down({ p: cellPx(from.x, from.y), shift, scale: 1 });
  tool.move({ p: cellPx((from.x + to.x) / 2, (from.y + to.y) / 2), shift, scale: 1 });
  tool.move({ p: cellPx(to.x, to.y), shift, scale: 1 });
}

beforeEach(() => {
  overlay = null;
  said = [];
  setGestureCancel(null);
});

describe("Select tool", () => {
  beforeEach(() => openTestShip([pilot, shields]));

  it("selects with a click, adds and removes with Shift, clears on empty space", () => {
    const tool = createSelectTool(context);
    tool.down(at(0.5, 0.5));
    tool.up(at(0.5, 0.5));
    expect(state().selection).toEqual(selectionOf({ kind: "room", id: 0 }));
    tool.down(at(4.5, 0.5, true));
    tool.up(at(4.5, 0.5, true));
    expect(state().selection.rooms).toEqual([0, 2]);
    tool.down(at(0.5, 0.5, true));
    tool.up(at(0.5, 0.5, true));
    expect(state().selection.rooms).toEqual([2]);
    tool.down(at(2, 0.5));
    tool.up(at(2, 0.5));
    expect(state().selection).toEqual(selectionOf({ kind: "door", index: 0 }));
    tool.down(at(3.5, 0.5));
    tool.up(at(3.5, 0.5));
    expect(state().selection).toEqual(selectionOf({ kind: "station", system: 0 }));
    tool.down(at(8, 8));
    tool.up(at(8, 8));
    expect(state().selection).toEqual(EMPTY_SELECTION);
  });

  it("shows what is under the pointer", () => {
    const tool = createSelectTool(context);
    tool.move(at(0.5, 0.5));
    expect(overlay).toEqual({ kind: "hover", target: { kind: "room", id: 0 } });
    tool.move(at(8, 8));
    expect(overlay).toBeNull();
  });

  it("moves the selected rooms by whole cells as one undo step", () => {
    const tool = createSelectTool(context);
    state().select(selectionOf({ kind: "room", id: 2 }));
    drag(tool, { x: 4.5, y: 0.5 }, { x: 4.6, y: 2.8 });
    expect(overlay).toEqual({
      kind: "ghost",
      cells: [{ id: 2, x: 4, y: 2, w: 1, h: 1 }],
      ok: true,
    });
    tool.up(at(4.6, 2.8));
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 2 });
    expect(steps()).toBe(1);
    expect(state().selection.rooms).toEqual([2]);
    state().undo();
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 0 });
  });

  it("drags a whole selection when one of its rooms is grabbed", () => {
    const tool = createSelectTool(context);
    state().select(selectionOf({ kind: "room", id: 0 }, { kind: "room", id: 1 }));
    drag(tool, { x: 0.5, y: 0.5 }, { x: 0.5, y: 2.5 });
    tool.up(at(0.5, 2.5));
    expect(ship().layout.rooms.map((r) => [r.x, r.y])).toEqual([
      [0, 2],
      [2, 2],
      [4, 0],
    ]);
    expect(ship().layout.doors[0]).toMatchObject({ x: 2, y: 2, roomA: 0, roomB: 1 });
  });

  it("does not move rooms outside the Layout workspace", () => {
    const tool = createSelectTool(context, false);
    drag(tool, { x: 4.5, y: 0.5 }, { x: 4.5, y: 2.5 });
    tool.up(at(4.5, 2.5));
    expect(state().selection.rooms).toEqual([2]);
    expect(undoAvailable(state())).toBe(false);
  });

  it("shows a refused move in red and does nothing on release", () => {
    const tool = createSelectTool(context);
    state().select(selectionOf({ kind: "room", id: 2 }));
    drag(tool, { x: 4.5, y: 0.5 }, { x: 3.5, y: 0.5 });
    expect(overlay).toMatchObject({ kind: "ghost", ok: false });
    tool.up(at(3.5, 0.5));
    expect(undoAvailable(state())).toBe(false);
  });

  it("cancels a drag with Esc without a step", () => {
    const tool = createSelectTool(context);
    state().select(selectionOf({ kind: "room", id: 2 }));
    drag(tool, { x: 4.5, y: 0.5 }, { x: 4.5, y: 3.5 });
    expect(cancelGesture()).toBe(true);
    expect(overlay).toBeNull();
    tool.up(at(4.5, 3.5));
    expect(undoAvailable(state())).toBe(false);
    expect(cancelGesture()).toBe(false);
  });

  it("selects rooms and doors inside a box", () => {
    const tool = createSelectTool(context);
    drag(tool, { x: -0.5, y: -0.5 }, { x: 4.2, y: 2.2 });
    expect(overlay).toMatchObject({ kind: "box" });
    tool.up(at(4.2, 2.2));
    expect(state().selection).toEqual({ rooms: [0, 1], doors: [0, 1, 2, 3], stations: [] });
  });

  it("snaps drags to the nearest whole cell", () => {
    expect(cellOffset({ x: 0, y: 0 }, { x: 17, y: -18 })).toEqual({ dx: 0, dy: -1 });
    expect(cellOffset({ x: 0, y: 0 }, { x: 53, y: 0 })).toEqual({ dx: 2, dy: 0 });
    expect(boxBetween({ x: 5, y: 1 }, { x: 1, y: 4 })).toEqual({ x: 1, y: 1, w: 4, h: 3 });
    expect(targetsInBox(ship(), { x: 0, y: 0, w: 1, h: 1 })).toEqual(EMPTY_SELECTION);
  });
});

describe("Room tool", () => {
  beforeEach(() => openTestShip());

  it("draws a room by dragging, selects it, one step", () => {
    const tool = createRoomTool(context);
    drag(tool, { x: 0.5, y: 2.5 }, { x: 2.5, y: 3.5 });
    expect(overlay).toEqual({ kind: "ghost", cells: [{ x: 0, y: 2, w: 3, h: 2 }], ok: true });
    tool.up(at(2.5, 3.5));
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: 0, y: 2, w: 3, h: 2 });
    expect(state().selection).toEqual(selectionOf({ kind: "room", id: 3 }));
    expect(steps()).toBe(1);
  });

  it("makes a 1x1 room from a click", () => {
    const tool = createRoomTool(context);
    tool.down(at(6.5, 0.5));
    tool.up(at(6.5, 0.5));
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: 6, y: 0, w: 1, h: 1 });
  });

  it("refuses overlaps and cells below 0", () => {
    const tool = createRoomTool(context);
    drag(tool, { x: 0.5, y: 2.5 }, { x: 2.5, y: 1.5 });
    expect(overlay).toMatchObject({ ok: false });
    tool.up(at(2.5, 1.5));
    drag(tool, { x: 6.5, y: 0.5 }, { x: 6.5, y: -0.5 });
    tool.up(at(6.5, -0.5));
    expect(ship().layout.rooms).toHaveLength(3);
    expect(undoAvailable(state())).toBe(false);
  });

  it("cancels with a right click or Esc", () => {
    const tool = createRoomTool(context);
    drag(tool, { x: 0.5, y: 3.5 }, { x: 1.5, y: 4.5 });
    tool.cancel();
    tool.up(at(1.5, 4.5));
    drag(tool, { x: 0.5, y: 3.5 }, { x: 1.5, y: 4.5 });
    cancelGesture();
    tool.up(at(1.5, 4.5));
    expect(ship().layout.rooms).toHaveLength(3);
  });
});

describe("Door tool", () => {
  beforeEach(() => openTestShip());

  it("highlights the nearest wall and adds a door there once", () => {
    const tool = createDoorTool(context);
    tool.move(at(1, 0.95));
    expect(overlay).toEqual({ kind: "wall", wall: { x: 1, y: 1, vertical: false }, exists: false });
    tool.down(at(1, 0.95));
    expect(ship().layout.doors[4]).toEqual({ x: 1, y: 1, roomA: 0, roomB: -1, vertical: false });
    expect(state().selection).toEqual(selectionOf({ kind: "door", index: 4 }));
    tool.down(at(1, 0.95));
    expect(ship().layout.doors).toHaveLength(5);
    expect(steps()).toBe(1);
    tool.move(at(1, 0.95));
    expect(overlay).toMatchObject({ exists: true });
    tool.move(at(9, 9));
    expect(overlay).toBeNull();
  });
});

describe("Station tool", () => {
  it("puts the station of the room's system on the clicked cell", () => {
    openTestShip([pilot, shields]);
    const tool = createStationTool(context);
    tool.move(at(0.5, 0.5));
    expect(overlay).toEqual({ kind: "cell", cell: { x: 0, y: 0 }, ok: true });
    tool.down(at(1.5, 0.5));
    expect(ship().blueprint.systems[1].slot).toEqual({ number: 1, direction: "right" });
    expect(state().selection).toEqual(selectionOf({ kind: "station", system: 1 }));
    expect(state().stationSystem).toBe(1);
    tool.down(at(2.5, 1.5));
    expect(ship().blueprint.systems[0].slot).toEqual({ number: 2, direction: "left" });
  });

  it("says when a room has no station system", () => {
    openTestShip([shields]);
    const tool = createStationTool(context);
    tool.move(at(4.5, 0.5));
    expect(overlay).toMatchObject({ ok: false });
    tool.down(at(4.5, 0.5));
    expect(said).toEqual([en.layout.noStationSystem]);
    expect(undoAvailable(state())).toBe(false);
  });

  it("uses the chosen system when the room has several", () => {
    expect(stationSystemFor([3, 5], 5)).toBe(5);
    expect(stationSystemFor([3, 5], 1)).toBe(3);
    expect(stationSystemFor([], null)).toBeUndefined();
  });
});
