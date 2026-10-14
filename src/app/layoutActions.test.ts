import { beforeEach, describe, expect, it } from "vitest";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { openTestShip, pilot, shields } from "../testing/layoutFixtures";
import { runCommand } from "./commands";
import {
  changeRoomValues,
  deleteSelected,
  deleteStation,
  nudgeSelection,
  placeStationAt,
  turnStation,
} from "./layoutActions";
import { EMPTY_SELECTION, selectionOf } from "./selection";
import { undoAvailable, useEditor } from "./store";

const state = () => useEditor.getState();
const ship = () => state().doc!.history.present.ship;
const steps = () => state().doc!.history.past.length;

describe("deleting the selection", () => {
  beforeEach(() => openTestShip([pilot, shields]));

  it("asks before deleting rooms that hold systems, and does nothing when refused", async () => {
    const platform = createFakePlatform();
    state().select(selectionOf({ kind: "room", id: 1 }, { kind: "room", id: 2 }));
    const refused = deleteSelected({ platform, texts: en });
    expect(state().confirmation).toMatchObject({
      title: en.layout.confirmDelete.title,
      message: en.layout.confirmDelete.message(1),
      confirm: en.layout.confirmDelete.confirm,
      danger: true,
    });
    state().answerConfirm(false);
    expect(await refused).toBe(false);
    expect(ship().layout.rooms).toHaveLength(3);

    const agreed = deleteSelected({ platform, texts: en });
    state().answerConfirm(true);
    expect(await agreed).toBe(true);
    expect(ship().layout.rooms).toHaveLength(1);
    expect(ship().blueprint.systems.map((s) => s.system)).toEqual(["shields"]);
    expect(state().selection).toEqual(EMPTY_SELECTION);
    expect(steps()).toBe(1);
    state().undo();
    expect(ship().layout.rooms).toHaveLength(3);
  });

  it("deletes rooms without systems and doors without asking", async () => {
    const platform = createFakePlatform();
    state().select(selectionOf({ kind: "room", id: 2 }, { kind: "door", index: 3 }));
    expect(await deleteSelected({ platform, texts: en })).toBe(true);
    expect(state().confirmation).toBeNull();
    expect(ship().layout.rooms).toHaveLength(2);
    expect(ship().layout.doors).toHaveLength(2);
  });

  it("runs from the Delete key in Rooms only", async () => {
    const platform = createFakePlatform();
    state().select(selectionOf({ kind: "door", index: 0 }));
    state().setWorkspace("hull");
    expect(runCommand("delete", { platform, texts: en })).toBe(false);
    state().setWorkspace("rooms");
    expect(runCommand("delete", { platform, texts: en })).toBe(true);
    await Promise.resolve();
    expect(ship().layout.doors).toHaveLength(3);
  });
});

describe("arrow keys", () => {
  beforeEach(() => openTestShip());

  it("move the selected rooms by one cell, or say why not", () => {
    state().select(selectionOf({ kind: "room", id: 2 }));
    expect(nudgeSelection(0, 1, en)).toBe(true);
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 1 });
    expect(nudgeSelection(-1, 0, en)).toBe(true);
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 1 });
    expect(state().notice).toEqual({ kind: "info", text: en.layout.problems.overlap });
    expect(steps()).toBe(1);
    expect(runCommand("move.right", { platform: createFakePlatform(), texts: en })).toBe(true);
    expect(ship().layout.rooms[2]).toMatchObject({ x: 5, y: 1 });
  });

  it("do nothing without selected rooms", () => {
    expect(nudgeSelection(1, 0, en)).toBe(false);
    expect(undoAvailable(state())).toBe(false);
  });
});

describe("inspector edits", () => {
  beforeEach(() => openTestShip([pilot, shields]));

  it("change a room's values with the move rules", () => {
    expect(changeRoomValues(2, { y: 2 })).toBeUndefined();
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 2 });
    expect(changeRoomValues(0, { x: 1 })).toBe("overlap");
    expect(changeRoomValues(2, { w: 0 })).toBe("tooSmall");
    expect(steps()).toBe(1);
  });

  it("place, turn and delete a station, each one step", () => {
    placeStationAt(1, 0);
    expect(ship().blueprint.systems[1].slot).toEqual({ number: 0, direction: "left" });
    turnStation(1, "up");
    expect(ship().blueprint.systems[1].slot!.direction).toBe("up");
    deleteStation(1);
    expect(ship().blueprint.systems[1].slot).toBeUndefined();
    expect(steps()).toBe(3);
  });
});
