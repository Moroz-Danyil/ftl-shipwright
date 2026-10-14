// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDoor, addRoom, type Point } from "../core";
import { EMPTY_SELECTION, selectionOf } from "../app/selection";
import { useEditor } from "../app/store";
import { en } from "../text/en";
import { withMiniShipOpen } from "../testing/editorFixtures";
import type { FakePlatform } from "../testing/fakePlatform";
import { App } from "./App";

const state = () => useEditor.getState();

/** Presses a key on the window, by its position on the keyboard. */
function press(code: string, extra: Partial<KeyboardEventInit> = {}) {
  act(() => {
    fireEvent.keyDown(window, { code, ...extra });
    fireEvent.keyUp(window, { code, ...extra });
  });
}

/** Clicks the canvas at a ship pixel. */
function clickShip(p: Point) {
  const { camera } = state().view;
  const main = screen.getByRole("main", { name: en.canvas.label });
  const at = {
    button: 0,
    clientX: p.x * camera.scale + camera.x,
    clientY: p.y * camera.scale + camera.y,
  };
  fireEvent.pointerDown(main, at);
  fireEvent.pointerUp(main, at);
}

let platform: FakePlatform;

beforeEach(async () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  });
  platform = await withMiniShipOpen();
  render(<App platform={platform} />);
  await waitFor(() =>
    expect(screen.getByTestId("ship-svg").querySelector(".cv-grid")).not.toBeNull()
  );
  // The canvas fits the ship once it knows its size, which can come a moment after the first render.
  await waitFor(() => expect(state().view.camera.x).not.toBe(0));
  // A ship opens in Ship; most tests here work on the rooms.
  expect(state().workspace).toBe("ship");
  press("Digit2");
});

afterEach(() => vi.restoreAllMocks());

describe("editor window", () => {
  it("shows the ship, its counts, the zoom and the game data", () => {
    expect(screen.getByText("The Mini")).toBeInTheDocument();
    expect(screen.getByText(/PLAYER_SHIP_MINI/)).toHaveTextContent(en.topBar.saved);
    const zoom = Math.round(state().view.camera.scale * 100);
    expect(screen.getByText(en.status.counts(2, 2, zoom))).toBeInTheDocument();
    expect(screen.getByText(/Game data: ftl\.dat/)).toHaveTextContent(en.status.noMod);
    expect(screen.getByRole("button", { name: en.topBar.checks(2) })).toBeInTheDocument();
  });

  it("fits the ship into the canvas on open", () => {
    const { camera } = state().view;
    expect(camera.scale).toBeGreaterThan(1);
    expect(camera.x).not.toBe(0);
  });

  it("switches workspaces with the tabs and the number keys", () => {
    fireEvent.click(screen.getByRole("tab", { name: /Hull/ }));
    expect(screen.getByRole("tab", { name: /Hull/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: en.tools.mount })).toBeInTheDocument();
    expect(screen.getByText(en.inspector.hull.eyebrow)).toBeInTheDocument();
    press("Digit2");
    expect(state().workspace).toBe("rooms");
    expect(screen.getByRole("button", { name: en.tools.room })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.tools.mount })).not.toBeInTheDocument();
  });

  it("opens the three workspaces in order with the keys 1 to 3", () => {
    const tablist = screen.getByRole("tablist", { name: en.topBar.workspaces });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "1" + en.workspaces.ship.label,
      "2" + en.workspaces.rooms.label,
      "3" + en.workspaces.hull.label,
    ]);
    const order = ["ship", "rooms", "hull"] as const;
    for (const [i, id] of [...order.entries()].reverse()) {
      press(`Digit${i + 1}`);
      expect(state().workspace).toBe(id);
      expect(tabs[i]).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText(en.workspaces[id].hint)).toBeInTheDocument();
    }
    press("Digit4");
    expect(state().workspace).toBe("ship");
  });

  it("picks tools with the rail and their keys", () => {
    const room = screen.getByRole("button", { name: en.tools.room });
    fireEvent.click(room);
    expect(room).toHaveAttribute("aria-pressed", "true");
    press("KeyQ");
    expect(screen.getByRole("button", { name: en.tools.select })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    press("KeyT");
    expect(screen.getByRole("button", { name: en.tools.select })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("labels each tool with its icon, name and key, and explains it beside the rail", () => {
    const rail = screen.getByRole("complementary", { name: en.toolRail.label });
    const tools = within(rail).getAllByRole("button");
    expect(tools.map((t) => t.textContent)).toEqual([
      en.tools.select + "Q",
      en.tools.room + "W",
      en.tools.door + "E",
      en.tools.station + "R",
    ]);
    expect(tools.every((t) => t.querySelector("svg") !== null)).toBe(true);
    expect(tools[0]).not.toHaveAttribute("title");

    fireEvent.pointerEnter(tools[2]);
    const help = within(screen.getByRole("tooltip")).getByRole("region", {
      name: en.common.withKey(en.toolHelp.rooms.door.title, "E"),
    });
    expect(help).toHaveTextContent(en.toolHelp.rooms.door.body);
    expect(rail).not.toContainElement(screen.getByRole("tooltip"));
    fireEvent.pointerLeave(tools[2]);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    press("Digit3");
    const mount = within(rail).getByRole("button", { name: en.tools.mount });
    expect(mount).toHaveTextContent(en.tools.mount + "T");
    fireEvent.focus(mount);
    expect(screen.getByRole("tooltip")).toHaveTextContent(en.toolHelp.hull.mount.body);
    fireEvent.blur(mount);
    press("Digit1");
    fireEvent.pointerEnter(within(rail).getByRole("button", { name: en.tools.select }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(en.toolHelp.ship.select.body);
  });

  it("selects a room or a door with a click and shows its values; Esc clears", () => {
    clickShip({ x: 50, y: 50 });
    expect(screen.getByTestId("room-0")).toHaveAttribute("data-selected", "true");
    const inspector = screen.getByRole("complementary", { name: en.inspector.label });
    expect(within(inspector).getByText(en.inspector.selectedRoom)).toBeInTheDocument();
    expect(within(inspector).getByLabelText(en.inspector.width)).toHaveValue(2);
    expect(within(inspector).getByRole("region", { name: "pilot" })).toBeInTheDocument();

    clickShip({ x: 35, y: 52 });
    expect(screen.getByTestId("door-1")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("door-1")).toHaveAttribute("data-kind", "airlock");
    expect(within(inspector).getByText(en.inspector.airlock)).toBeInTheDocument();

    press("Escape");
    expect(state().selection).toEqual(EMPTY_SELECTION);
    expect(within(inspector).getByText(en.inspector.nothingSelected)).toBeInTheDocument();

    clickShip({ x: 50, y: 50 });
    clickShip({ x: 400, y: 400 });
    expect(state().selection).toEqual(EMPTY_SELECTION);
  });

  it("selects nothing with other tools", () => {
    press("KeyW");
    clickShip({ x: 50, y: 50 });
    expect(state().selection).toEqual(EMPTY_SELECTION);
  });

  it("toggles layers and the hangar preview", () => {
    const svg = screen.getByTestId("ship-svg");
    expect(svg.querySelector(".cv-grid")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: en.canvas.layers }));
    const grid = screen.getByRole("checkbox", { name: en.canvas.layerNames.grid });
    expect(screen.getByRole("checkbox", { name: en.canvas.layerNames.cloak })).not.toBeChecked();
    fireEvent.click(grid);
    expect(svg.querySelector(".cv-grid")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: en.canvas.layerNames.doors }));
    expect(screen.queryByTestId("door-0")).not.toBeInTheDocument();
    fireEvent.click(grid);

    expect(svg.querySelector(".cv-room-id")).toBeNull();
    const numbers = screen.getByRole("checkbox", { name: en.canvas.layerNames.roomNumbers });
    expect(numbers).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: en.canvas.layerNames.interiors })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: en.canvas.layerNames.systemIcons })).toBeChecked();
    fireEvent.click(numbers);
    expect(svg.querySelectorAll(".cv-room-id")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: en.canvas.preview }));
    const hangar = screen.getByTestId("hangar-svg");
    expect(hangar.querySelector(".cv-room")).not.toBeNull();
    expect(hangar.querySelector(".cv-grid")).toBeNull();
    expect(hangar.querySelector(".cv-room-id")).toBeNull();
    expect(within(hangar).queryByTestId("view-limit")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.canvas.previewOff }));
    expect(screen.queryByTestId("hangar-svg")).not.toBeInTheDocument();
    expect(screen.getByTestId("view-limit")).toBeInTheDocument();
  });

  it("draws the shield ellipse when there is no shield picture", () => {
    expect(screen.getByTestId("shield-ellipse")).toBeInTheDocument();
    expect(screen.getByTestId("mount-1")).toHaveTextContent("1");
  });

  it("zooms with the wheel around the cursor", () => {
    const before = state().view.camera.scale;
    fireEvent.wheel(screen.getByRole("main", { name: en.canvas.label }), {
      deltaY: -200,
      clientX: 400,
      clientY: 300,
    });
    expect(state().view.camera.scale).toBeGreaterThan(before);
  });

  it("pans with the middle button", () => {
    const main = screen.getByRole("main", { name: en.canvas.label });
    const { x, y } = state().view.camera;
    fireEvent.pointerDown(main, { button: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(main, { clientX: 130, clientY: 90 });
    fireEvent.pointerUp(main, { clientX: 130, clientY: 90 });
    expect(state().view.camera.x).toBeCloseTo(x + 30);
    expect(state().view.camera.y).toBeCloseTo(y - 10);
  });

  it("undoes and redoes with the buttons and keys, and marks unsaved changes", () => {
    const undo = screen.getByRole("button", { name: en.topBar.undo });
    expect(undo).toBeDisabled();
    act(() => state().edit((s) => addRoom(s, { x: 4, y: 0, w: 1, h: 1 })));
    expect(screen.getByText(en.topBar.unsaved)).toBeInTheDocument();
    expect(undo).toBeEnabled();
    press("KeyZ", { ctrlKey: true });
    expect(state().doc!.history.present.ship.layout.rooms).toHaveLength(2);
    expect(screen.queryByText(en.topBar.unsaved)).not.toBeInTheDocument();
    press("KeyY", { ctrlKey: true });
    expect(state().doc!.history.present.ship.layout.rooms).toHaveLength(3);
    fireEvent.click(undo);
    fireEvent.click(screen.getByRole("button", { name: en.topBar.redo }));
    expect(state().doc!.history.present.ship.layout.rooms).toHaveLength(3);
  });

  it("counts the checks, lists them and shows what they are about", () => {
    act(() => state().edit((s) => addDoor(s, { x: 9, y: 9, vertical: true })));
    const checks = screen.getByRole("button", { name: en.topBar.checks(3) });
    fireEvent.click(checks);
    const dialog = screen.getByRole("dialog", { name: en.checks.title });
    const message = en.checks.messages["door-no-room"]({ door: 2 });
    fireEvent.click(within(dialog).getByRole("button", { name: message }));
    expect(state().selection).toEqual(selectionOf({ kind: "door", index: 2 }));
    expect(screen.getByTestId("door-2")).toHaveAttribute("data-kind", "loose");
  });

  it("saves a .ftl file from the Save mod dialog and then with Ctrl+S", async () => {
    act(() => state().edit((s) => addRoom(s, { x: 4, y: 0, w: 1, h: 1 })));
    platform.answers.pickSavePath.push("out/mini.ftl");
    fireEvent.click(screen.getByRole("button", { name: en.topBar.saveMod }));
    const dialog = screen.getByRole("dialog", { name: en.save.title });
    fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(en.save.ftl) }));
    expect(await screen.findByText(en.save.savedTo("out/mini.ftl"))).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(platform.disk.has("out/mini.ftl")).toBe(true);
    expect(platform.asked.at(-1)).toMatchObject({ kind: "pickSavePath", defaultPath: "mini.ftl" });
    expect(screen.queryByText(en.topBar.unsaved)).not.toBeInTheDocument();

    act(() => state().edit((s) => addRoom(s, { x: 5, y: 0, w: 1, h: 1 })));
    platform.disk.clear();
    press("KeyS", { ctrlKey: true });
    await waitFor(() => expect(platform.disk.has("out/mini.ftl")).toBe(true));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks in its own dialog before closing a ship with unsaved changes", async () => {
    act(() => state().edit((s) => addRoom(s, { x: 4, y: 0, w: 1, h: 1 })));
    const close = screen.getByRole("button", { name: en.topBar.closeShip });
    const ask = async () => {
      fireEvent.click(close);
      return screen.findByRole("dialog", { name: en.topBar.confirmClose.title });
    };

    let dialog = await ask();
    expect(within(dialog).getByText(en.topBar.confirmClose.message)).toBeInTheDocument();
    const cancel = within(dialog).getByRole("button", { name: en.common.cancel });
    expect(cancel).toHaveFocus();
    expect(
      within(dialog).getByRole("button", { name: en.topBar.confirmClose.confirm })
    ).toHaveClass("btn--destructive");
    fireEvent.click(cancel);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(state().doc).toBeDefined();

    dialog = await ask();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(state().doc).toBeDefined();

    dialog = await ask();
    fireEvent.click(within(dialog).getByRole("button", { name: en.topBar.confirmClose.confirm }));
    expect(await screen.findByText(en.app.name)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes a saved ship without asking", async () => {
    fireEvent.click(screen.getByRole("button", { name: en.topBar.closeShip }));
    expect(await screen.findByText(en.app.name)).toBeInTheDocument();
    expect(state().confirmation).toBeNull();
  });

  it("keeps the editor's keys away while a question is open", async () => {
    act(() => state().edit((s) => addRoom(s, { x: 4, y: 0, w: 1, h: 1 })));
    fireEvent.click(screen.getByRole("button", { name: en.topBar.closeShip }));
    await screen.findByRole("dialog");
    press("Digit3");
    expect(state().workspace).toBe("rooms");
  });
});
