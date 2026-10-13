import { beforeEach, describe, expect, it } from "vitest";
import { createShip, memorySource } from "../core";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { runCommand } from "./commands";
import { commandForEvent, isTextField, keysOfEvent, type KeyEventLike } from "./keys";
import { EMPTY_SELECTION, selectionOf } from "./selection";
import { currentTool, resetEditorStore, useEditor } from "./store";

const key = (code: string, extra: Partial<KeyEventLike> = {}): KeyEventLike => ({
  code,
  key: "",
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...extra,
});

describe("key names", () => {
  it("names keys by position, so any keyboard layout works", () => {
    expect(keysOfEvent(key("KeyZ", { key: "я", ctrlKey: true }))).toBe("Ctrl+Z");
    expect(keysOfEvent(key("KeyZ", { ctrlKey: true, shiftKey: true }))).toBe("Ctrl+Shift+Z");
    expect(keysOfEvent(key("KeyY", { metaKey: true }))).toBe("Ctrl+Y");
    expect(keysOfEvent(key("Digit3", { key: "3" }))).toBe("3");
    expect(keysOfEvent(key("Numpad2", { key: "2" }))).toBe("2");
    expect(keysOfEvent(key("Escape", { key: "Escape" }))).toBe("Escape");
    expect(keysOfEvent(key("Space", { key: " " }))).toBe("Space");
    expect(keysOfEvent(key("BracketLeft", { key: "х" }))).toBe("[");
  });

  it("finds the bound command", () => {
    expect(commandForEvent(key("KeyZ", { ctrlKey: true }))).toBe("undo");
    expect(commandForEvent(key("KeyZ", { ctrlKey: true, shiftKey: true }))).toBe("redo");
    expect(commandForEvent(key("KeyY", { ctrlKey: true }))).toBe("redo");
    expect(commandForEvent(key("KeyS", { ctrlKey: true }))).toBe("save");
    expect(commandForEvent(key("Digit1"))).toBe("workspace.layout");
    expect(commandForEvent(key("Digit5"))).toBe("workspace.details");
    expect(commandForEvent(key("KeyV"))).toBe("tool.select");
    expect(commandForEvent(key("KeyH"))).toBe("tool.movePicture");
    expect(commandForEvent(key("Escape"))).toBe("cancel");
    expect(commandForEvent(key("Space"))).toBe("pan");
    expect(commandForEvent(key("KeyQ"))).toBeUndefined();
    expect(commandForEvent(key("KeyR", { ctrlKey: true }))).toBeUndefined();
  });

  it("tells text fields from other elements", () => {
    const el = (tagName: string, extra: Record<string, unknown> = {}) =>
      ({ tagName, ...extra }) as unknown as EventTarget;
    expect(isTextField(el("INPUT", { type: "text" }))).toBe(true);
    expect(isTextField(el("INPUT", { type: "search" }))).toBe(true);
    expect(isTextField(el("INPUT", { type: "checkbox" }))).toBe(false);
    expect(isTextField(el("TEXTAREA"))).toBe(true);
    expect(isTextField(el("DIV", { isContentEditable: true }))).toBe(true);
    expect(isTextField(el("BUTTON"))).toBe(false);
    expect(isTextField(null)).toBe(false);
  });
});

describe("commands", () => {
  const context = { platform: createFakePlatform(), texts: en };
  const art = { source: memorySource({}), gibs: [] };

  beforeEach(() => resetEditorStore());

  it("do nothing while no ship is open", () => {
    expect(runCommand("workspace.art", context)).toBe(false);
    expect(useEditor.getState().workspace).toBe("layout");
  });

  it("switch workspaces and tools, clear the selection and save", () => {
    const ship = createShip({ name: "T", layout: "t", img: "t" });
    useEditor.getState().openDocument({ ship, art, saved: true });
    runCommand("workspace.art", context);
    expect(useEditor.getState().workspace).toBe("art");
    runCommand("tool.mount", context);
    expect(currentTool(useEditor.getState())).toBe("mount");
    runCommand("tool.room", context);
    expect(currentTool(useEditor.getState())).toBe("mount");
    useEditor.getState().select(selectionOf({ kind: "room", id: 0 }));
    runCommand("cancel", context);
    expect(useEditor.getState().selection).toEqual(EMPTY_SELECTION);
    runCommand("save", context);
    expect(useEditor.getState().dialog).toBe("save");
  });
});
