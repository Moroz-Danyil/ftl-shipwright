// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShipSystem } from "../core";
import { selectionOf } from "../app/selection";
import { useEditor } from "../app/store";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { cellPx, pilot, shields } from "../testing/layoutFixtures";
import { openSystemsShip } from "../testing/systemsFixtures";
import { App } from "./App";

const state = () => useEditor.getState();
const ship = () => state().doc!.history.present.ship;
const systems = () => ship().blueprint.systems;
const steps = () => state().doc!.history.past.length;

function screenAt(cx: number, cy: number) {
  const { camera } = state().view;
  const p = cellPx(cx, cy);
  return { clientX: p.x * camera.scale + camera.x, clientY: p.y * camera.scale + camera.y };
}

const canvas = () => screen.getByRole("main", { name: en.canvas.label });
const inspector = () => screen.getByRole("complementary", { name: en.inspector.label });
const chip = (name: string) =>
  within(inspector()).getByRole("button", { name: new RegExp(`^${name}`) });

function selectRoom(cx: number, cy: number) {
  fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(cx, cy) });
  fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(cx, cy) });
}

/** Presses a chip and releases it in place (a click). */
function clickChip(name: string) {
  fireEvent.pointerDown(chip(name), { button: 0, clientX: 5, clientY: 5 });
  act(() => {
    fireEvent.pointerUp(window, { clientX: 5, clientY: 5 });
  });
}

/** Drags a chip to a cell of the ship and optionally releases it. */
function dragChip(name: string, to: { clientX: number; clientY: number }, release = true) {
  fireEvent.pointerDown(chip(name), { button: 0, clientX: 5, clientY: 5 });
  act(() => {
    fireEvent.pointerMove(window, { clientX: 30, clientY: 30 });
    fireEvent.pointerMove(window, to);
    if (release) fireEvent.pointerUp(window, to);
  });
}

async function setUp(shipSystems: ShipSystem[]) {
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
  openSystemsShip(shipSystems);
  render(<App platform={createFakePlatform()} />);
  await waitFor(() =>
    expect(screen.getByTestId("ship-svg").querySelector(".cv-grid")).not.toBeNull()
  );
  act(() => state().setWorkspace("systems"));
}

afterEach(() => vi.restoreAllMocks());

describe("Systems palette and canvas", () => {
  beforeEach(() => setUp([pilot, shields]));

  it("shows where each system is and its icon in the rooms", async () => {
    expect(chip("Shields")).toHaveTextContent(en.systems.inRoom(0));
    expect(chip("Piloting")).toHaveTextContent(en.systems.inRoom(1));
    expect(chip("Oxygen")).not.toHaveTextContent("room");
    const room0 = screen.getByTestId("system-icons-0");
    expect(await within(room0).findByTestId("system-icon-shields")).toBeInTheDocument();
    expect(
      await within(screen.getByTestId("system-icons-1")).findByTestId("system-icon-pilot")
    ).toBeInTheDocument();
    expect(await within(chip("Shields")).findByTestId("ui-icon-shields")).toHaveAttribute(
      "data-loaded",
      "true"
    );
    expect(within(inspector()).getByText(en.systems.help)).toBeInTheDocument();
  });

  it("places a system in the selected room with a click, one step", () => {
    clickChip("Oxygen");
    expect(state().notice?.text).toBe(en.systems.selectRoomFirst);
    selectRoom(4.5, 0.5);
    clickChip("Oxygen");
    expect(systems()[2]).toEqual({ system: "oxygen", power: 1, room: 2, start: true });
    expect(steps()).toBe(1);
    expect(chip("Oxygen")).toHaveTextContent(en.systems.inRoom(2));
    act(() => state().undo());
    expect(systems()).toHaveLength(2);
  });

  it("places, moves and removes systems by dragging chips", () => {
    dragChip("Oxygen", screenAt(4.5, 0.5), false);
    expect(screen.getByTestId("system-drop")).toHaveAttribute("data-ok", "true");
    expect(screen.getByTestId("drag-chip")).toHaveTextContent("Oxygen");
    act(() => {
      fireEvent.pointerUp(window, screenAt(4.5, 0.5));
    });
    expect(systems()[2]).toMatchObject({ system: "oxygen", room: 2 });
    expect(screen.queryByTestId("drag-chip")).not.toBeInTheDocument();

    dragChip("Shields", screenAt(4.5, 0.5));
    expect(systems().find((s) => s.system === "shields")).toMatchObject({ room: 2, start: false });

    dragChip("Shields", screenAt(5.5, 1.5));
    expect(systems().some((s) => s.system === "shields")).toBe(false);
    expect(steps()).toBe(3);
  });

  it("does nothing for a drop the rules refuse, or after Esc", () => {
    dragChip("Shields", screenAt(0.5, 0.5), false);
    expect(screen.getByTestId("system-drop")).toHaveAttribute("data-ok", "false");
    act(() => {
      fireEvent.pointerUp(window, screenAt(0.5, 0.5));
    });
    dragChip("Oxygen", screenAt(4.5, 0.5), false);
    act(() => {
      fireEvent.keyDown(window, { code: "Escape", key: "Escape" });
    });
    expect(screen.queryByTestId("drag-chip")).not.toBeInTheDocument();
    act(() => {
      fireEvent.pointerUp(window, screenAt(4.5, 0.5));
    });
    expect(steps()).toBe(0);
  });
});

describe("Systems inspector", () => {
  it("edits levels, installs one system per room and removes systems", async () => {
    await setUp([
      { system: "medbay", power: 1, room: 1, start: true },
      { system: "clonebay", power: 1, room: 1, start: false },
    ]);
    act(() => state().select(selectionOf({ kind: "room", id: 1 })));
    const medbay = within(inspector()).getByRole("region", { name: "Medbay" });
    const clone = within(inspector()).getByRole("region", { name: "Clone Bay" });
    const raise = within(medbay).getByRole("button", { name: en.systems.higher(en.systems.level) });
    fireEvent.click(raise);
    fireEvent.click(raise);
    fireEvent.click(raise);
    expect(systems()[0].power).toBe(3);
    expect(raise).toBeDisabled();
    expect(within(medbay).getByText(en.systems.levelOf(3, 3))).toBeInTheDocument();

    fireEvent.click(within(clone).getByRole("checkbox", { name: en.systems.installed }));
    expect(systems().map((s) => s.start)).toEqual([false, true]);
    expect(await screen.findByTestId("system-icon-medbay")).toHaveAttribute("data-later", "true");
    expect(screen.getByTestId("system-icon-clonebay")).not.toHaveAttribute("data-later");

    fireEvent.click(
      within(clone).getByRole("button", { name: en.systems.removeNamed("Clone Bay") })
    );
    expect(systems().map((s) => s.system)).toEqual(["medbay"]);
    expect(steps()).toBe(4);
  });

  it("shows the upgrade limit only where it applies", async () => {
    await setUp([{ ...shields, max: 5 }, pilot]);
    act(() => state().select(selectionOf({ kind: "room", id: 0 })));
    const card = within(inspector()).getByRole("region", { name: "Shields" });
    expect(within(card).getByRole("group", { name: en.systems.upgradeLimit })).toBeInTheDocument();
    act(() => state().select(selectionOf({ kind: "room", id: 1 })));
    const pilotCard = within(inspector()).getByRole("region", { name: "Piloting" });
    expect(within(pilotCard).queryByRole("group", { name: en.systems.upgradeLimit })).toBeNull();
  });

  it("picks interior pictures and warns about misfits, strongly for cloaking", async () => {
    await setUp([{ system: "cloaking", power: 1, room: 0, start: true }]);
    act(() => state().select(selectionOf({ kind: "room", id: 0 })));
    const card = within(inspector()).getByRole("region", { name: "Cloaking" });
    expect(await within(card).findByText("room_cloaking_2")).toBeInTheDocument();
    expect(within(card).queryByText("room_cloaking_glow")).toBeNull();
    expect(within(card).queryByText("room_shields")).toBeNull();
    fireEvent.click(within(card).getByRole("radio", { name: /room_cloaking_2/ }));
    expect(systems()[0].img).toBe("room_cloaking_2");
    expect(await within(card).findByText(en.systems.cloakMismatch)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: en.topBar.checks(3) })).toBeInTheDocument()
    );

    fireEvent.click(within(card).getByRole("radio", { name: /^room_cloaking70/ }));
    await waitFor(() => expect(within(card).queryByText(en.systems.cloakMismatch)).toBeNull());
    fireEvent.click(within(card).getByRole("radio", { name: en.systems.interiorNone }));
    expect(systems()[0].img).toBeUndefined();
    fireEvent.click(within(card).getByRole("checkbox", { name: en.systems.interiorAll }));
    expect(await within(card).findByText("room_shields_3")).toBeInTheDocument();
  });

  it("chooses the artillery weapon and warns about unusual mixes", async () => {
    await setUp([
      { system: "artillery", power: 1, room: 2, weapon: "ARTILLERY_OLD" },
      { system: "oxygen", power: 1, room: 2, start: false },
    ]);
    act(() => state().select(selectionOf({ kind: "room", id: 2 })));
    expect(within(inspector()).getByText(en.systems.unusualMix)).toBeInTheDocument();
    const select = within(inspector()).getByRole("combobox", { name: en.systems.artilleryWeapon });
    expect(select).toHaveValue("ARTILLERY_OLD");
    fireEvent.change(select, { target: { value: "ARTILLERY_FED" } });
    expect(systems()[0].weapon).toBe("ARTILLERY_FED");
    expect(within(select).queryByText("LASER_BURST_1")).toBeNull();
  });

  it("opens Systems from a system check", async () => {
    await setUp([
      { system: "medbay", power: 1, room: 1, start: true },
      { system: "clonebay", power: 1, room: 1, start: true },
    ]);
    act(() => state().setWorkspace("layout"));
    fireEvent.click(screen.getByRole("button", { name: en.topBar.checks(3) }));
    fireEvent.click(
      screen.getByRole("button", { name: en.checks.messages["several-installed"]({ rooms: [1] }) })
    );
    expect(state().workspace).toBe("systems");
    expect(state().selection.rooms).toEqual([1]);
  });
});
