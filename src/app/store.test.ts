import { beforeEach, describe, expect, it } from "vitest";
import { addRoom, createShip, memorySource, removeRoom, type Ship } from "../core";
import {
  currentShip,
  currentTool,
  hasUnsavedChanges,
  redoAvailable,
  resetEditorStore,
  undoAvailable,
  useEditor,
} from "./store";
import { EMPTY_SELECTION, selectionOf, validSelection } from "./selection";

const art = { source: memorySource({}), gibs: [] };

function shipWithRooms(): Ship {
  let ship = createShip({ name: "TEST", layout: "test", img: "test" });
  ship = addRoom(ship, { x: 0, y: 0, w: 2, h: 1 });
  return addRoom(ship, { x: 2, y: 0, w: 2, h: 2 });
}

const state = () => useEditor.getState();

describe("editor store", () => {
  beforeEach(() => resetEditorStore());

  it("opens a ship as saved and tracks unsaved changes through undo and redo", () => {
    const ship = shipWithRooms();
    state().openDocument({ ship, art, origin: { kind: "game" }, saved: true });
    expect(currentShip(state())).toBe(ship);
    expect(hasUnsavedChanges(state())).toBe(false);
    expect(undoAvailable(state())).toBe(false);

    state().edit((s) => addRoom(s, { x: 0, y: 2, w: 1, h: 1 }));
    expect(currentShip(state())!.layout.rooms).toHaveLength(3);
    expect(hasUnsavedChanges(state())).toBe(true);
    expect(undoAvailable(state())).toBe(true);

    state().undo();
    expect(currentShip(state())).toBe(ship);
    expect(hasUnsavedChanges(state())).toBe(false);
    expect(redoAvailable(state())).toBe(true);

    state().redo();
    expect(currentShip(state())!.layout.rooms).toHaveLength(3);
    expect(hasUnsavedChanges(state())).toBe(true);
  });

  it("records no step for an edit that changes nothing", () => {
    state().openDocument({ ship: shipWithRooms(), art, saved: true });
    state().edit((s) => s);
    expect(undoAvailable(state())).toBe(false);
  });

  it("treats a new ship as unsaved until it is saved", () => {
    const ship = shipWithRooms();
    state().openDocument({ ship, art, saved: false });
    expect(hasUnsavedChanges(state())).toBe(true);
    const target = { kind: "ftl" as const, path: "out/test.ftl" };
    state().markSaved({ ship, art: state().doc!.history.present.art }, target, {
      kind: "modFile",
      path: target.path,
    });
    expect(hasUnsavedChanges(state())).toBe(false);
    expect(state().doc!.saveTarget).toEqual(target);
    expect(state().doc!.origin).toEqual({ kind: "modFile", path: "out/test.ftl" });
  });

  it("keeps changes made after the saved state as unsaved", () => {
    const ship = shipWithRooms();
    state().openDocument({ ship, art, saved: false });
    state().edit((s) => addRoom(s, { x: 5, y: 5, w: 1, h: 1 }));
    const target = { kind: "folder" as const, path: "mods/x" };
    state().markSaved({ ship, art: state().doc!.history.present.art }, target, {
      kind: "modFolder",
      path: target.path,
    });
    expect(hasUnsavedChanges(state())).toBe(true);
  });

  it("drops a selection that undo or redo leaves pointing at nothing", () => {
    state().openDocument({ ship: shipWithRooms(), art, saved: true });
    state().edit((s) => addRoom(s, { x: 0, y: 3, w: 1, h: 1 }));
    state().select(selectionOf({ kind: "room", id: 2 }));
    state().undo();
    expect(state().selection).toEqual(EMPTY_SELECTION);
    state().select(selectionOf({ kind: "room", id: 1 }));
    state().redo();
    expect(state().selection.rooms).toEqual([1]);
    state().edit((s) => removeRoom(s, 1));
    expect(currentShip(state())!.layout.rooms).toHaveLength(2);
  });

  it("checks selections against the ship", () => {
    const ship = shipWithRooms();
    const one = selectionOf({ kind: "room", id: 1 });
    expect(validSelection(ship, one)).toBe(one);
    expect(validSelection(ship, selectionOf({ kind: "room", id: 7 }))).toEqual(EMPTY_SELECTION);
    expect(validSelection(ship, selectionOf({ kind: "door", index: 0 }))).toEqual(EMPTY_SELECTION);
    expect(validSelection(ship, selectionOf({ kind: "station", system: 0 }))).toEqual(
      EMPTY_SELECTION
    );
  });

  it("keeps one tool per workspace and refuses tools a workspace does not have", () => {
    state().openDocument({ ship: shipWithRooms(), art, saved: true });
    expect(currentTool(state())).toBe("select");
    state().setTool("room");
    expect(currentTool(state())).toBe("select");
    state().setWorkspace("rooms");
    state().setTool("room");
    expect(currentTool(state())).toBe("room");
    state().setTool("mount");
    expect(currentTool(state())).toBe("room");
    state().setWorkspace("hull");
    expect(currentTool(state())).toBe("select");
    state().setTool("mount");
    state().setWorkspace("rooms");
    expect(currentTool(state())).toBe("room");
    state().setWorkspace("hull");
    expect(currentTool(state())).toBe("mount");
  });

  it("starts each opened ship in Ship with the Select tool and nothing selected", () => {
    state().openDocument({ ship: shipWithRooms(), art, saved: true });
    state().setWorkspace("hull");
    state().select(selectionOf({ kind: "room", id: 0 }));
    const firstId = state().doc!.id;
    state().openDocument({ ship: shipWithRooms(), art, saved: true });
    expect(state().doc!.id).not.toBe(firstId);
    expect(state().workspace).toBe("ship");
    expect(state().selection).toEqual(EMPTY_SELECTION);
    state().closeDocument();
    expect(state().doc).toBeUndefined();
  });

  it("shows the cloak and gibs only when asked", () => {
    const layers = state().view.layers;
    expect(layers.cloak).toBe(false);
    expect(layers.gibs).toBe(false);
    expect(layers.hull && layers.rooms && layers.grid).toBe(true);
    state().setLayer("cloak", true);
    expect(state().view.layers.cloak).toBe(true);
    state().setHangarPreview(true);
    expect(state().view.hangarPreview).toBe(true);
  });
});
