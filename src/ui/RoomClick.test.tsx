// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addMount, mountPositionPx, type Point } from "../core";
import { selectionOf } from "../app/selection";
import { ROOM_SYSTEMS_SECTION, useEditor } from "../app/store";
import type { WorkspaceId } from "../app/workspaces";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { cellPx, pilot, shields } from "../testing/layoutFixtures";
import { openSystemsShip } from "../testing/systemsFixtures";
import { App } from "./App";

const state = () => useEditor.getState();
const ship = () => state().doc!.history.present.ship;
const canvas = () => screen.getByRole("main", { name: en.canvas.label });
const inspector = () => screen.getByRole("complementary", { name: en.inspector.label });
const infoPanel = () => screen.getByRole("complementary", { name: en.info.label });

function screenAt(p: Point) {
  const { camera } = state().view;
  return { clientX: p.x * camera.scale + camera.x, clientY: p.y * camera.scale + camera.y };
}

function click(p: Point, shiftKey = false) {
  fireEvent.pointerDown(canvas(), { button: 0, shiftKey, ...screenAt(p) });
  fireEvent.pointerUp(canvas(), { button: 0, shiftKey, ...screenAt(p) });
}

function drag(from: Point, to: Point) {
  fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(from) });
  fireEvent.pointerMove(canvas(), screenAt(to));
  fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(to) });
}

function open(workspace: WorkspaceId) {
  act(() => state().setWorkspace(workspace));
}

/** A cell of room 1 (piloting) away from its station, and of room 0 (shields). */
const ROOM_1 = cellPx(2.5, 1.5);
const ROOM_0 = cellPx(0.5, 0.5);

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
  openSystemsShip([pilot, shields]);
  // Every section starts folded, as when the app starts.
  useEditor.setState({ openSections: {} });
  render(<App platform={createFakePlatform()} />);
  await waitFor(() =>
    expect(screen.getByTestId("ship-svg").querySelector(".cv-grid")).not.toBeNull()
  );
});

afterEach(() => vi.restoreAllMocks());

describe("selecting a room with systems", () => {
  it("opens its systems, with the starting level and installed at the start first", () => {
    open("rooms");
    expect(state().openSections[ROOM_SYSTEMS_SECTION]).toBeUndefined();
    click(ROOM_0);
    const section = within(inspector()).getByRole("region", { name: en.sections.roomSystems });
    expect(
      within(section).getByRole("button", { name: new RegExp(`^${en.sections.roomSystems}`) })
    ).toHaveAttribute("aria-expanded", "true");
    const card = within(section).getByRole("region", { name: "Shields" });
    const level = within(card).getByRole("group", { name: en.systems.level });
    const installed = within(card).getByRole("checkbox", { name: en.systems.installed });
    // The first two fields of the card, before every other one.
    const fields = card.querySelectorAll(".help-target");
    expect(fields[0]).toContainElement(level);
    expect(fields[1]).toContainElement(installed);
  });

  it("leaves the section as it is for a room without systems, and folded stays folded", () => {
    open("rooms");
    click(cellPx(4.5, 0.5));
    expect(state().selection.rooms).toEqual([2]);
    expect(state().openSections[ROOM_SYSTEMS_SECTION]).toBeUndefined();
    act(() => state().setSectionOpen(ROOM_SYSTEMS_SECTION, false));
    act(() => state().select(selectionOf({ kind: "room", id: 2 })));
    expect(state().openSections[ROOM_SYSTEMS_SECTION]).toBe(false);
  });
});

describe("a click or drag in Ship and Hull", () => {
  it("in Ship, opens Rooms with the room selected", () => {
    open("ship");
    click(ROOM_1);
    expect(state().workspace).toBe("rooms");
    expect(state().tools.rooms).toBe("select");
    expect(state().selection.rooms).toEqual([1]);
    expect(state().openSections[ROOM_SYSTEMS_SECTION]).toBe(true);
    expect(within(inspector()).getByRole("region", { name: "Piloting" })).toBeInTheDocument();
  });

  it("in Ship, opens Rooms for a door, a Shift-click and a drag, which moves the room", () => {
    open("ship");
    click(cellPx(2, 0.5));
    expect(state().workspace).toBe("rooms");
    expect(state().selection.doors).toEqual([0]);
    open("ship");
    click(ROOM_1, true);
    expect(state().workspace).toBe("rooms");
    expect(state().selection).toMatchObject({ rooms: [1], doors: [0] });
    open("ship");
    drag(cellPx(4.5, 0.5), cellPx(4.5, 2.5));
    expect(state().workspace).toBe("rooms");
    expect(state().selection.rooms).toEqual([2]);
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 2 });
    expect(screen.getByTestId("room-handles")).toHaveAttribute("data-room", "2");
  });

  it("in Hull, opens Rooms for a room, while a click on a mount still selects the mount", () => {
    open("hull");
    const origin = mountPositionPx(ship().layout, ship().layoutXml, { x: 0, y: 0 });
    act(() =>
      state().edit((s) =>
        addMount(s, {
          x: ROOM_0.x - origin.x,
          y: ROOM_0.y - origin.y,
          rotate: false,
          mirror: false,
          gib: 0,
        })
      )
    );
    click(ROOM_0);
    expect(state().workspace).toBe("hull");
    expect(state().selection.mounts).toEqual([0]);
    click(ROOM_1);
    expect(state().workspace).toBe("rooms");
    expect(state().selection.rooms).toEqual([1]);
  });
});

describe("Edit in the Info panel", () => {
  it("opens a room's system in Rooms", () => {
    open("ship");
    act(() => state().select(selectionOf({ kind: "room", id: 0 })));
    act(() => state().setSectionOpen(ROOM_SYSTEMS_SECTION, false));
    fireEvent.click(
      within(infoPanel()).getByRole("button", { name: en.info.editSystem("Shields") })
    );
    expect(state().workspace).toBe("rooms");
    expect(state().selection.rooms).toEqual([0]);
    expect(state().openSections[ROOM_SYSTEMS_SECTION]).toBe(true);
  });

  it("opens the room of the system the panel describes", () => {
    open("hull");
    act(() => state().pickInfo({ kind: "system", system: "pilot" }));
    fireEvent.click(
      within(infoPanel()).getByRole("button", { name: en.info.editSystem("Piloting") })
    );
    expect(state().workspace).toBe("rooms");
    expect(state().selection.rooms).toEqual([1]);
    expect(state().infoPick).toBeNull();
  });
});
