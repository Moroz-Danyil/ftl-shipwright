import { beforeEach, describe, expect, it } from "vitest";
import type { Mount } from "../core";
import { pastingGhost } from "../canvas/tools/pasteTool";
import { en } from "../text/en";
import { openArtShip } from "../testing/artFixtures";
import { createFakePlatform } from "../testing/fakePlatform";
import { cellPx } from "../testing/layoutFixtures";
import { placePasting } from "./clipboardActions";
import { DEFAULT_BINDINGS, commandForEvent } from "./keys";
import { runCommand, type CommandContext } from "./commands";
import { setGestureCancel } from "./gesture";
import { setCanvasPointer } from "./pointer";
import { EMPTY_SELECTION, type Selection } from "./selection";
import { useEditor } from "./store";

/*
 * The art test ship: rooms 0 (0,0) 2×1, 1 (2,0) 2×2 and 2 (4,0) 1×1, two
 * gibs, and a mount at hull (100, 80).
 */
const state = () => useEditor.getState();
const snap = () => state().doc!.history.present;
const ship = () => snap().ship;
const xml = () => ship().layoutXml;
const steps = () => state().doc!.history.past.length;
const context: CommandContext = { platform: createFakePlatform(), texts: en };
const run = (command: Parameters<typeof runCommand>[0]) => runCommand(command, context);

const MOUNT: Mount = { x: 100, y: 80, rotate: false, mirror: false, gib: 0 };
/** Room 2, mount 0 and gib 1. */
const MIXED: Selection = { ...EMPTY_SELECTION, rooms: [2], mounts: [0], gibs: [1] };

beforeEach(() => {
  setCanvasPointer(null);
  setGestureCancel(null);
  openArtShip([MOUNT]);
  state().setWorkspace("rooms");
});

describe("Ctrl+A", () => {
  it("is a fixed key", () => {
    const event = { code: "KeyA", key: "a", ctrlKey: true, metaKey: false, shiftKey: false };
    expect(commandForEvent({ ...event, altKey: false }, DEFAULT_BINDINGS)).toBe("selectAll");
  });

  it("selects every room, mount and gib the canvas shows", () => {
    expect(run("selectAll")).toBe(true);
    expect(state().selection).toEqual({ ...EMPTY_SELECTION, rooms: [0, 1, 2], mounts: [0] });
    state().setLayer("gibs", true);
    run("selectAll");
    expect(state().selection).toEqual({
      ...EMPTY_SELECTION,
      rooms: [0, 1, 2],
      mounts: [0],
      gibs: [0, 1],
    });
    expect(state().workspace).toBe("rooms");
  });

  it("opens Rooms from Ship, and selects nothing in a ship with nothing to select", () => {
    state().setWorkspace("ship");
    run("selectAll");
    expect(state().workspace).toBe("rooms");
    state().setLayer("rooms", false);
    state().setLayer("mounts", false);
    state().select(EMPTY_SELECTION);
    expect(run("selectAll")).toBe(false);
    expect(state().selection).toEqual(EMPTY_SELECTION);
  });
});

describe("a mixed selection", () => {
  beforeEach(() => state().select(MIXED));

  it("is deleted as a whole, one undo step", async () => {
    state().setWorkspace("hull");
    expect(run("delete")).toBe(true);
    await Promise.resolve();
    expect(ship().layout.rooms).toHaveLength(2);
    expect(xml().mounts).toHaveLength(0);
    expect(xml().gibs).toHaveLength(1);
    expect(snap().art.gibs).toHaveLength(1);
    expect(state().selection).toEqual(EMPTY_SELECTION);
    expect(steps()).toBe(1);
    state().undo();
    expect(ship().layout.rooms).toHaveLength(3);
    expect(xml().mounts).toEqual([MOUNT]);
    expect(xml().gibs).toHaveLength(2);
  });

  it("is duplicated as a whole, the mounts and gibs as far as the rooms", () => {
    expect(run("duplicate")).toBe(true);
    // Next to the copied room (one cell right), and the mount and gib 35 px right.
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: 5, y: 0, w: 1, h: 1 });
    expect(xml().mounts[1]).toMatchObject({ x: 135, y: 80 });
    expect(xml().gibs[2]).toMatchObject({ x: 135, y: 0 });
    expect(state().selection).toEqual({ ...EMPTY_SELECTION, rooms: [3], mounts: [1], gibs: [2] });
    expect(state().clipboard).toEqual({});
    expect(steps()).toBe(1);
  });

  it("is copied as a whole and pastes together under the pointer, also in Hull", () => {
    state().setWorkspace("hull");
    expect(run("copy")).toBe(true);
    expect(state().notice?.text).toBe(
      en.clipboard.copied(
        en.clipboard.together([en.clipboard.rooms(1, 0, 1), en.clipboard.art(1, 1)])
      )
    );
    setCanvasPointer(cellPx(10.5, 5.5));
    expect(run("paste")).toBe(true);
    expect(state().pasting?.offset).toEqual({ dx: 6, dy: 5 });
    const ghost = pastingGhost(ship(), state().pasting!);
    expect(ghost).toMatchObject({ kind: "ghost", ok: true, mounts: [{ x: 335, y: 270 }] });
    expect(placePasting(en)).toBeUndefined();
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: 10, y: 5, w: 1, h: 1 });
    expect(xml().mounts[1]).toMatchObject({ x: 310, y: 255 });
    expect(xml().gibs[2]).toMatchObject({ x: 310, y: 175 });
    expect(state().selection).toEqual({ ...EMPTY_SELECTION, rooms: [3], mounts: [1], gibs: [2] });
    expect(state().workspace).toBe("hull");
    expect(steps()).toBe(1);
  });

  it("is cut as a whole and pasted back in Rooms", () => {
    expect(run("cut")).toBe(true);
    expect(ship().layout.rooms).toHaveLength(2);
    expect(xml().mounts).toHaveLength(0);
    expect(steps()).toBe(1);
    expect(run("paste")).toBe(true);
    expect(ship().layout.rooms).toHaveLength(3);
    expect(xml().mounts).toHaveLength(1);
    expect(xml().gibs).toHaveLength(2);
    expect(steps()).toBe(2);
  });

  it("leaves Hull pasting only mounts and gibs once they were copied on their own", () => {
    run("copy");
    state().select({ ...EMPTY_SELECTION, mounts: [0] });
    run("copy");
    state().setWorkspace("hull");
    run("paste");
    expect(state().pasting).toBeNull();
    expect(ship().layout.rooms).toHaveLength(3);
    expect(xml().mounts).toHaveLength(2);
    // Rooms still pastes the rooms with what was copied together with them.
    state().setWorkspace("rooms");
    run("paste");
    expect(ship().layout.rooms).toHaveLength(4);
    expect(xml().mounts).toHaveLength(3);
    expect(xml().gibs).toHaveLength(3);
  });

  it("has no clipboard in Ship", () => {
    state().setWorkspace("ship");
    expect(run("copy")).toBe(false);
    expect(run("duplicate")).toBe(false);
  });
});
