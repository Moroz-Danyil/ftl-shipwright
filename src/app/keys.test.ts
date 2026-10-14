import { beforeEach, describe, expect, it } from "vitest";
import { createShip, memorySource } from "../core";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { runCommand } from "./commands";
import {
  DEFAULT_KEYS,
  bindableKeysOfEvent,
  bindingsOf,
  changedKeys,
  commandForEvent,
  isBindableKeys,
  isTextField,
  keyConflict,
  keyLabel,
  keyMapFrom,
  keysOfEvent,
  rebind,
  type KeyEventLike,
} from "./keys";
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
    expect(commandForEvent(key("Digit1"))).toBe("workspace.ship");
    expect(commandForEvent(key("Digit2"))).toBe("workspace.rooms");
    expect(commandForEvent(key("Digit3"))).toBe("workspace.hull");
    expect(commandForEvent(key("Digit4"))).toBeUndefined();
    expect(commandForEvent(key("Escape"))).toBe("cancel");
    expect(commandForEvent(key("Space"))).toBe("pan");
    expect(commandForEvent(key("Delete"))).toBe("delete");
    expect(commandForEvent(key("Backspace"))).toBe("delete");
    expect(commandForEvent(key("KeyV"))).toBeUndefined();
    expect(commandForEvent(key("KeyR", { ctrlKey: true }))).toBeUndefined();
  });

  it("has the default keys: Q W E R T H G for the tools, Ctrl+Z, Ctrl+Y and D", () => {
    const tools = { KeyQ: "select", KeyW: "room", KeyE: "door", KeyR: "station", KeyT: "mount" };
    for (const [code, tool] of Object.entries(tools))
      expect(commandForEvent(key(code))).toBe(`tool.${tool}`);
    expect(commandForEvent(key("KeyH"))).toBe("tool.movePicture");
    expect(commandForEvent(key("KeyG"))).toBe("tool.gib");
    expect(commandForEvent(key("KeyD"))).toBe("delete");
    expect(commandForEvent(key("KeyY", { ctrlKey: true }))).toBe("redo");
  });

  it("names signs and F-keys by position and tells which presses can be bound", () => {
    expect(keysOfEvent(key("Semicolon", { key: "ж" }))).toBe(";");
    expect(bindableKeysOfEvent(key("KeyK", { key: "л", altKey: true }))).toBe("Alt+K");
    expect(bindableKeysOfEvent(key("F5", { key: "F5" }))).toBe("F5");
    expect(bindableKeysOfEvent(key("ControlLeft", { key: "Control", ctrlKey: true }))).toBe(
      undefined
    );
    expect(bindableKeysOfEvent(key("Escape", { key: "Escape" }))).toBeUndefined();
    expect(bindableKeysOfEvent(key("Enter", { key: "Enter" }))).toBeUndefined();
    expect(bindableKeysOfEvent(key("Tab", { key: "Tab" }))).toBeUndefined();
    expect(bindableKeysOfEvent(key("IntlBackslash", { key: "<" }))).toBeUndefined();
    expect(keyLabel("Shift+ArrowUp")).toBe("Shift+↑");
    expect(keyLabel("Ctrl+Z")).toBe("Ctrl+Z");
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

describe("changing keys", () => {
  it("binds the chosen keys and keeps the fixed ones", () => {
    const map = { ...DEFAULT_KEYS, "tool.select": "Ctrl+Shift+V" };
    const bindings = bindingsOf(map);
    expect(commandForEvent(key("KeyV", { ctrlKey: true, shiftKey: true }), bindings)).toBe(
      "tool.select"
    );
    expect(commandForEvent(key("KeyQ"), bindings)).toBeUndefined();
    expect(commandForEvent(key("KeyZ", { ctrlKey: true, shiftKey: true }), bindings)).toBe("redo");
  });

  it("swaps with the command that had the keys and refuses fixed keys", () => {
    expect(keyConflict(DEFAULT_KEYS, "tool.select", "K")).toBeUndefined();
    expect(keyConflict(DEFAULT_KEYS, "tool.select", "W")).toEqual({
      kind: "taken",
      command: "tool.room",
    });
    expect(keyConflict(DEFAULT_KEYS, "undo", "Ctrl+S")).toEqual({ kind: "fixed", command: "save" });
    const swapped = rebind(DEFAULT_KEYS, "tool.select", "W");
    expect(swapped["tool.select"]).toBe("W");
    expect(swapped["tool.room"]).toBe("Q");
    expect(rebind(DEFAULT_KEYS, "tool.select", "Space")).toBe(DEFAULT_KEYS);
    expect(rebind(DEFAULT_KEYS, "tool.select", "Q")).toBe(DEFAULT_KEYS);
    expect(changedKeys(swapped)).toEqual({ "tool.select": "W", "tool.room": "Q" });
  });

  it("reads remembered changes, ignoring what is unknown or invalid", () => {
    expect(keyMapFrom({ "tool.gib": "K", undo: "Alt+U" })).toEqual({
      ...DEFAULT_KEYS,
      "tool.gib": "K",
      undo: "Alt+U",
    });
    expect(
      keyMapFrom({
        "tool.gib": 5,
        "tool.fly": "K",
        "tool.door": "Space",
        redo: "Escape",
        delete: "Ctrl+Fn",
      })
    ).toEqual(DEFAULT_KEYS);
    expect(keyMapFrom({ "tool.gib": "Q" })).toEqual(DEFAULT_KEYS);
    expect(keyMapFrom("Q")).toEqual(DEFAULT_KEYS);
    expect(keyMapFrom(["Q"])).toEqual(DEFAULT_KEYS);
    expect(keyMapFrom(null)).toEqual(DEFAULT_KEYS);
    expect(isBindableKeys("Ctrl+Alt+Shift+F12")).toBe(true);
    expect(isBindableKeys("Shift+Ctrl+A")).toBe(false);
  });
});

describe("commands", () => {
  const context = { platform: createFakePlatform(), texts: en };
  const art = { source: memorySource({}), gibs: [] };

  beforeEach(() => resetEditorStore());

  it("do nothing while no ship is open", () => {
    expect(runCommand("workspace.hull", context)).toBe(false);
    expect(useEditor.getState().workspace).toBe("ship");
  });

  it("switch workspaces and tools, clear the selection and save", () => {
    const ship = createShip({ name: "T", layout: "t", img: "t" });
    useEditor.getState().openDocument({ ship, art, saved: true });
    runCommand("workspace.hull", context);
    expect(useEditor.getState().workspace).toBe("hull");
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
