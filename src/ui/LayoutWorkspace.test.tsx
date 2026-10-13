// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Point } from "../core";
import { selectionOf } from "../app/selection";
import { useEditor } from "../app/store";
import { en } from "../text/en";
import { createFakePlatform, type FakePlatform } from "../testing/fakePlatform";
import { cellPx, openTestShip, pilot, shields } from "../testing/layoutFixtures";
import { App } from "./App";

const state = () => useEditor.getState();
const ship = () => state().doc!.history.present.ship;
const steps = () => state().doc!.history.past.length;

function press(code: string, extra: Partial<KeyboardEventInit> = {}) {
  act(() => {
    fireEvent.keyDown(window, { code, ...extra });
    fireEvent.keyUp(window, { code, ...extra });
  });
}

/** Pointer position on the canvas for a (fractional) cell of the test ship. */
function screenAt(cx: number, cy: number) {
  const { camera } = state().view;
  const p: Point = cellPx(cx, cy);
  return { clientX: p.x * camera.scale + camera.x, clientY: p.y * camera.scale + camera.y };
}

const canvas = () => screen.getByRole("main", { name: en.canvas.label });
const inspector = () => screen.getByRole("complementary", { name: en.inspector.label });

function click(cx: number, cy: number, shiftKey = false) {
  fireEvent.pointerDown(canvas(), { button: 0, shiftKey, ...screenAt(cx, cy) });
  fireEvent.pointerUp(canvas(), { button: 0, shiftKey, ...screenAt(cx, cy) });
}

function commitField(label: string, value: string) {
  const field = within(inspector()).getByLabelText(label);
  fireEvent.change(field, { target: { value } });
  fireEvent.keyDown(field, { key: "Enter" });
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
  openTestShip([pilot, shields]);
  platform = createFakePlatform();
  render(<App platform={platform} />);
  await waitFor(() =>
    expect(screen.getByTestId("ship-svg").querySelector(".cv-grid")).not.toBeNull()
  );
});

afterEach(() => vi.restoreAllMocks());

describe("Layout on the canvas", () => {
  it("drags a room to a new cell as one undo step, with a ghost on the way", () => {
    click(4.5, 0.5);
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(4.5, 0.5) });
    fireEvent.pointerMove(canvas(), screenAt(4.5, 1.6));
    fireEvent.pointerMove(canvas(), screenAt(4.5, 2.6));
    expect(screen.getByTestId("ghost")).toHaveAttribute("data-ok", "true");
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(4.5, 2.6) });
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 2 });
    expect(steps()).toBe(1);
    expect(screen.queryByTestId("ghost")).not.toBeInTheDocument();
  });

  it("cancels a drag with Esc", () => {
    click(4.5, 0.5);
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(4.5, 0.5) });
    fireEvent.pointerMove(canvas(), screenAt(4.5, 3.6));
    press("Escape");
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(4.5, 3.6) });
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 0 });
    expect(state().selection.rooms).toEqual([2]);
  });

  it("draws rooms with the Room tool and doors with the Door tool", () => {
    press("KeyR");
    expect(canvas()).toHaveAttribute("data-tool", "room");
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(0.5, 1.5) });
    fireEvent.pointerMove(canvas(), screenAt(1.5, 1.5));
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(1.5, 1.5) });
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: 0, y: 1, w: 2, h: 1 });

    press("KeyD");
    fireEvent.pointerMove(canvas(), screenAt(1.5, 0.95));
    expect(screen.getByTestId("wall")).toBeInTheDocument();
    click(1.5, 0.95);
    expect(ship().layout.doors[4]).toMatchObject({
      x: 1,
      y: 1,
      vertical: false,
      roomA: 0,
      roomB: 3,
    });
    expect(screen.getByTestId("door-4")).toHaveAttribute("data-kind", "inner");
  });

  it("moves the selection with the arrow keys and deletes it with Delete", () => {
    click(4.5, 0.5);
    press("ArrowDown");
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 1 });
    click(2, 0.5);
    press("Delete");
    expect(ship().layout.doors).toHaveLength(3);
    press("Escape");
    expect(state().selection.doors).toEqual([]);
  });
});

describe("Layout inspector", () => {
  it("edits a room's values and refuses invalid ones with a message", () => {
    click(4.5, 0.5);
    commitField(en.inspector.y, "2");
    expect(ship().layout.rooms[2]).toMatchObject({ y: 2 });
    commitField(en.inspector.x, "-1");
    expect(within(inspector()).getByRole("alert")).toHaveTextContent(en.layout.problems.belowZero);
    expect(within(inspector()).getByLabelText(en.inspector.x)).toHaveValue(4);
    expect(steps()).toBe(1);
  });

  it("shows a room's systems, doors and a link to Systems", () => {
    click(2.5, 1.5);
    const panel = inspector();
    expect(within(panel).getByText(en.inspector.doorsOnWalls(3))).toBeInTheDocument();
    expect(within(panel).getAllByText("pilot").length).toBeGreaterThan(0);
    fireEvent.click(within(panel).getByRole("button", { name: en.inspector.changeInSystems }));
    expect(state().workspace).toBe("systems");
  });

  it("asks before deleting a room with systems", async () => {
    click(2.5, 1.5);
    platform.answers.confirm.push(true);
    fireEvent.click(within(inspector()).getByRole("button", { name: en.inspector.delete }));
    await waitFor(() => expect(ship().layout.rooms).toHaveLength(2));
    expect(platform.asked[0].message).toBe(en.layout.confirmDelete(1));
  });

  it("counts several selected things", () => {
    act(() => state().select(selectionOf({ kind: "room", id: 0 }, { kind: "door", index: 1 })));
    expect(within(inspector()).getByText(en.inspector.severalTitle(2))).toBeInTheDocument();
    expect(within(inspector()).getByText(en.inspector.severalParts(1, 1, 0))).toBeInTheDocument();
  });

  it("turns and deletes a selected station", () => {
    click(3.5, 0.5);
    expect(within(inspector()).getByText(en.inspector.selectedStation)).toBeInTheDocument();
    fireEvent.click(within(inspector()).getByRole("button", { name: en.inspector.directions.up }));
    expect(screen.getByTestId("station-0")).toHaveAttribute("data-direction", "up");
    fireEvent.click(within(inspector()).getByRole("button", { name: en.inspector.delete }));
    expect(screen.queryByTestId("station-0")).not.toBeInTheDocument();
  });

  it("chooses which system the Station tool places", () => {
    press("KeyT");
    const chooser = within(inspector()).getByRole("group", { name: en.inspector.stationFor });
    fireEvent.click(within(chooser).getByRole("radio", { name: /shields/ }));
    expect(state().stationSystem).toBe(1);
    click(0.5, 0.5);
    expect(ship().blueprint.systems[1].slot).toEqual({ number: 0, direction: "left" });
  });

  it("shows help for the current tool", () => {
    expect(within(inspector()).getByText(en.inspector.toolHelp.select.title)).toBeInTheDocument();
    press("KeyD");
    expect(within(inspector()).getByText(en.inspector.toolHelp.door.title)).toBeInTheDocument();
  });
});
