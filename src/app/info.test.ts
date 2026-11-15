// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { infoSubject, systemLevels, workspaceSelection } from "./info";
import { EMPTY_SELECTION, selectionOf } from "./selection";
import { initialEditorState, useEditor } from "./store";
import { openTestShip } from "../testing/layoutFixtures";

const state = () => useEditor.getState();
const weapon = { kind: "item", item: "weapon", name: "LASER_BURST_1" } as const;

describe("the Info panel's subject", () => {
  it("is the item clicked in a list, else the selection, else the ship", () => {
    const room = selectionOf({ kind: "room", id: 2 });
    expect(infoSubject(room, weapon, "ship")).toEqual(weapon);
    expect(infoSubject(room, null, "rooms")).toEqual({ kind: "room", id: 2 });
    expect(infoSubject(EMPTY_SELECTION, null, "rooms")).toEqual({ kind: "ship" });
    const two = selectionOf({ kind: "room", id: 2 }, { kind: "door", index: 0 });
    expect(infoSubject(two, null, "rooms")).toEqual({ kind: "several", selection: two });
  });

  it("takes the part of the selection the workspace works with", () => {
    const mixed = selectionOf(
      { kind: "room", id: 1 },
      { kind: "gib", index: 0 },
      { kind: "weapon", index: 1 }
    );
    expect(workspaceSelection(mixed, "hull")).toEqual(selectionOf({ kind: "gib", index: 0 }));
    expect(workspaceSelection(mixed, "rooms")).toEqual(selectionOf({ kind: "room", id: 1 }));
    expect(infoSubject(mixed, null, "hull")).toEqual({ kind: "gib", index: 0 });
    expect(infoSubject(mixed, null, "ship")).toEqual({
      kind: "several",
      selection: selectionOf({ kind: "room", id: 1 }, { kind: "weapon", index: 1 }),
    });
    expect(infoSubject(selectionOf({ kind: "mount", index: 0 }), null, "rooms")).toEqual({
      kind: "ship",
    });
  });
});

describe("the item clicked in a list", () => {
  beforeEach(() => {
    localStorage.clear();
    openTestShip();
  });

  it("stays the subject until something is selected or another workspace is opened", () => {
    state().pickInfo(weapon);
    expect(state().infoPick).toEqual(weapon);
    // An edit that selects something (adding the item to a slot) keeps it.
    state().edit((ship) => ship, selectionOf({ kind: "room", id: 0 }));
    expect(state().infoPick).toEqual(weapon);
    // A selection made by the user, even the same one, drops it.
    state().select(selectionOf({ kind: "room", id: 0 }));
    expect(state().infoPick).toBeNull();

    state().pickInfo({ kind: "system", system: "shields" });
    state().setWorkspace("rooms");
    expect(state().infoPick).not.toBeNull();
    state().setWorkspace("hull");
    expect(state().infoPick).toBeNull();

    state().pickInfo({ kind: "race", race: "human" });
    state().startTour();
    expect(state().infoPick).toBeNull();
    state().endTour();
    state().pickInfo({ kind: "race", race: "human" });
    state().closeDocument();
    expect(state().infoPick).toBeNull();
  });

  it("remembers whether the panel is open between runs", () => {
    expect(state().infoPanelOpen).toBe(true);
    state().setInfoPanelOpen(false);
    expect(localStorage.getItem("shipwright.infoPanel")).toBe("false");
    expect(initialEditorState().infoPanelOpen).toBe(false);
    state().setInfoPanelOpen(true);
    expect(initialEditorState().infoPanelOpen).toBe(true);
  });
});

describe("the levels of a system", () => {
  it("are the game's texts where it has them, shields one barrier per two levels", () => {
    const texts = {
      english: Object.assign(Object.create(null), {
        shields_0: "One",
        shields_1: "Two",
        door_1: "Normal doors",
      }),
    };
    expect(systemLevels(texts, "shields")).toEqual([
      { level: 2, text: "One" },
      { level: 4, text: "Two" },
    ]);
    expect(systemLevels(texts, "doors")).toEqual([{ level: 1, text: "Normal doors" }]);
    expect(systemLevels(texts, "oxygen")).toEqual([]);
    expect(systemLevels(undefined, "shields")).toEqual([]);
  });
});
