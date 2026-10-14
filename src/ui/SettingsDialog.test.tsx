// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_KEYS } from "../app/keys";
import { resetEditorStore, useEditor } from "../app/store";
import { en } from "../text/en";
import { withMiniShipOpen } from "../testing/editorFixtures";
import { createFakePlatform } from "../testing/fakePlatform";
import { App } from "./App";

const html = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  resetEditorStore();
});

afterEach(() => {
  delete html().dataset.theme;
});

describe("settings", () => {
  it("opens from the start screen and changes the theme, remembering it", () => {
    render(<App platform={createFakePlatform({})} />);
    expect(html().dataset.theme).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: en.start.settings }));
    const dialog = screen.getByRole("dialog", { name: en.settings.title });
    fireEvent.click(within(dialog).getByRole("radio", { name: en.settings.light }));

    expect(html().dataset.theme).toBe("light");
    expect(within(dialog).getByRole("radio", { name: en.settings.light })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(JSON.parse(localStorage.getItem("shipwright.theme")!)).toBe("light");
  });

  it("opens from the editor's top bar and scales the interface", async () => {
    const platform = await withMiniShipOpen();
    render(<App platform={platform} />);

    fireEvent.click(screen.getByRole("button", { name: en.topBar.settings }));
    const dialog = screen.getByRole("dialog", { name: en.settings.title });
    fireEvent.click(within(dialog).getByRole("radio", { name: en.settings.scaleValue(150) }));

    expect(useEditor.getState().uiScale).toBe(150);
    await waitFor(() => expect(platform.zoom).toBe(1.5));
    expect(JSON.parse(localStorage.getItem("shipwright.scale")!)).toBe(150);

    fireEvent.click(within(dialog).getByRole("button", { name: en.common.close }));
    expect(screen.queryByRole("dialog", { name: en.settings.title })).not.toBeInTheDocument();
  });

  it("starts with the remembered theme and scale", async () => {
    localStorage.setItem("shipwright.theme", JSON.stringify("light"));
    localStorage.setItem("shipwright.scale", JSON.stringify(125));
    resetEditorStore();
    const platform = createFakePlatform({});
    render(<App platform={platform} />);
    expect(html().dataset.theme).toBe("light");
    await waitFor(() => expect(platform.zoom).toBe(1.25));
  });
});

describe("settings keyboard", () => {
  it("focuses the chosen scale and moves the choice with the arrow keys", () => {
    render(<App platform={createFakePlatform({})} />);
    fireEvent.click(screen.getByRole("button", { name: en.start.settings }));
    const chosen = screen.getByRole("radio", { name: en.settings.scaleValue(100) });
    expect(chosen).toHaveFocus();
    fireEvent.keyDown(chosen, { key: "ArrowRight" });
    expect(useEditor.getState().uiScale).toBe(110);
    fireEvent.keyDown(chosen, { key: "ArrowLeft" });
    expect(useEditor.getState().uiScale).toBe(100);
  });
});

describe("settings shortcuts", () => {
  /** Opens Settings from the editor (in Rooms) on the Shortcuts tab. */
  async function openShortcuts() {
    const platform = await withMiniShipOpen();
    render(<App platform={platform} />);
    fireEvent.keyDown(window, { code: "Digit2" });
    fireEvent.click(screen.getByRole("button", { name: en.topBar.settings }));
    const dialog = screen.getByRole("dialog", { name: en.settings.title });
    fireEvent.click(within(dialog).getByRole("tab", { name: en.settings.shortcuts }));
    return dialog;
  }
  const keyButton = (dialog: HTMLElement, name: string, key: string) =>
    within(dialog).getByRole("button", { name: en.shortcuts.change(name, key) });
  const closeDialog = (dialog: HTMLElement) =>
    fireEvent.click(within(dialog).getByRole("button", { name: en.common.close }));
  const pressOn = (el: HTMLElement, code: string, extra: Partial<KeyboardEventInit> = {}) => {
    fireEvent.keyDown(el, { code, ...extra });
    fireEvent.keyUp(el, { code, ...extra });
  };
  const names = en.shortcuts.names;

  it("has General and Shortcuts tabs, moved between with the arrow keys", () => {
    render(<App platform={createFakePlatform({})} />);
    fireEvent.click(screen.getByRole("button", { name: en.start.settings }));
    const tabs = within(screen.getByRole("tablist", { name: en.settings.sections })).getAllByRole(
      "tab"
    );
    expect(tabs.map((t) => t.textContent)).toEqual([en.settings.general, en.settings.shortcuts]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", tabs[0].id);
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", tabs[1].id);
    expect(screen.getByRole("tabpanel")).toHaveTextContent(en.shortcuts.hint);
    expect(screen.getByRole("tabpanel")).toHaveTextContent(en.shortcuts.fixedKeys);
    fireEvent.keyDown(tabs[1], { key: "Home" });
    expect(screen.getByRole("radio", { name: en.settings.dark })).toBeInTheDocument();
  });

  it("lists the tools, Undo, Redo and Delete selected with their keys", async () => {
    const dialog = await openShortcuts();
    const rows = within(dialog).getAllByRole("listitem");
    expect(rows.map((r) => r.querySelector(".set-key-name")?.textContent)).toEqual([
      names["tool.select"],
      names["tool.room"],
      names["tool.door"],
      names["tool.station"],
      names["tool.movePicture"],
      names["tool.mount"],
      names["tool.gib"],
      names.undo,
      names.redo,
      names.delete,
    ]);
    expect(rows.map((r) => r.querySelector(".set-key")?.textContent).join(" ")).toBe(
      "Q W E R H T G Ctrl+Z Ctrl+Y D"
    );
    expect(within(dialog).getByRole("button", { name: en.shortcuts.resetAll })).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: en.shortcuts.reset(names["tool.room"], "W") })
    ).toBeDisabled();
  });

  it("changes a tool key: the new key picks the tool and the tool shows it", async () => {
    const dialog = await openShortcuts();
    const button = keyButton(dialog, names["tool.room"], "W");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent(en.shortcuts.pressKey);
    pressOn(button, "ShiftLeft", { key: "Shift", shiftKey: true });
    expect(button).toHaveAttribute("aria-pressed", "true");
    pressOn(button, "KeyK", { key: "л", shiftKey: true });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("Shift+K");
    expect(useEditor.getState().keys["tool.room"]).toBe("Shift+K");
    expect(JSON.parse(localStorage.getItem("shipwright.shortcuts")!)).toEqual({
      "tool.room": "Shift+K",
    });
    closeDialog(dialog);

    expect(screen.getByRole("button", { name: en.tools.room })).toHaveTextContent(
      en.tools.room + "Shift+K"
    );
    fireEvent.keyDown(window, { code: "KeyW" });
    expect(useEditor.getState().tools.rooms).toBe("select");
    fireEvent.keyDown(window, { code: "KeyK", shiftKey: true });
    expect(useEditor.getState().tools.rooms).toBe("room");
  });

  it("cancels a capture with Esc and keeps the dialog open", async () => {
    const dialog = await openShortcuts();
    const button = keyButton(dialog, names.undo, "Ctrl+Z");
    fireEvent.click(button);
    pressOn(button, "Escape", { key: "Escape" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("Ctrl+Z");
    expect(screen.getByRole("dialog", { name: en.settings.title })).toBeInTheDocument();
    expect(useEditor.getState().keys.undo).toBe("Ctrl+Z");
  });

  it("offers to swap a key another action has", async () => {
    const dialog = await openShortcuts();
    const button = keyButton(dialog, names["tool.select"], "Q");
    fireEvent.click(button);
    pressOn(button, "KeyE", { key: "e" });
    const alert = within(dialog).getByRole("alert");
    expect(alert).toHaveTextContent(en.shortcuts.taken("E", names["tool.door"], "Q"));
    expect(useEditor.getState().keys["tool.select"]).toBe("Q");

    fireEvent.click(within(alert).getByRole("button", { name: en.common.cancel }));
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(useEditor.getState().keys["tool.select"]).toBe("Q");

    fireEvent.click(button);
    pressOn(button, "KeyE", { key: "e" });
    fireEvent.click(within(dialog).getByRole("button", { name: en.shortcuts.swap }));
    expect(useEditor.getState().keys["tool.select"]).toBe("E");
    expect(useEditor.getState().keys["tool.door"]).toBe("Q");
    expect(keyButton(dialog, names["tool.door"], "Q")).toBeInTheDocument();
  });

  it("refuses a fixed key", async () => {
    const dialog = await openShortcuts();
    const button = keyButton(dialog, names.delete, "D");
    fireEvent.click(button);
    pressOn(button, "Space", { key: " " });
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      en.shortcuts.fixed("Space", en.shortcuts.fixedActions.pan)
    );
    expect(useEditor.getState().keys.delete).toBe("D");
    fireEvent.click(button);
    pressOn(button, "KeyS", { key: "s", ctrlKey: true });
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      en.shortcuts.fixed("Ctrl+S", en.shortcuts.fixedActions.save)
    );
    expect(useEditor.getState().keys.delete).toBe("D");
  });

  it("resets one key and all keys", async () => {
    const dialog = await openShortcuts();
    act(() => {
      useEditor.getState().setKey("tool.gib", "K");
      useEditor.getState().setKey("redo", "Alt+Y");
    });
    const resetAll = within(dialog).getByRole("button", { name: en.shortcuts.resetAll });
    expect(resetAll).toBeEnabled();
    fireEvent.click(
      within(dialog).getByRole("button", { name: en.shortcuts.reset(names["tool.gib"], "G") })
    );
    expect(useEditor.getState().keys["tool.gib"]).toBe("G");
    expect(useEditor.getState().keys.redo).toBe("Alt+Y");
    fireEvent.click(resetAll);
    expect(useEditor.getState().keys).toEqual(DEFAULT_KEYS);
    expect(resetAll).toBeDisabled();
    expect(JSON.parse(localStorage.getItem("shipwright.shortcuts")!)).toEqual({});
  });

  it("starts with the remembered keys", async () => {
    localStorage.setItem("shipwright.shortcuts", JSON.stringify({ "tool.door": "J", undo: 3 }));
    resetEditorStore();
    expect(useEditor.getState().keys).toEqual({ ...DEFAULT_KEYS, "tool.door": "J" });
    const dialog = await openShortcuts();
    expect(keyButton(dialog, names["tool.door"], "J")).toBeInTheDocument();
  });
});
