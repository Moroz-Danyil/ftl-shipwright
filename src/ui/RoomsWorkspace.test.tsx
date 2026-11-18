// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addRoom, loadShip, memorySource, saveShip, type Point } from "../core";
import { hangarShipOffset } from "../canvas/hangar/hangarLayout";
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

describe("Rooms on the canvas", () => {
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

  it("resizes the selected room by a handle, with its size and the resize pointer", () => {
    click(4.5, 0.5);
    expect(screen.getByTestId("room-handles").querySelectorAll(".cv-handle")).toHaveLength(8);
    fireEvent.pointerMove(canvas(), screenAt(5, 1));
    expect(canvas().style.cursor).toBe("nwse-resize");
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(5, 1) });
    fireEvent.pointerMove(canvas(), screenAt(6, 2));
    fireEvent.pointerMove(canvas(), screenAt(7, 2));
    expect(screen.getByTestId("ghost")).toHaveAttribute("data-ok", "true");
    expect(screen.getByTestId("ghost-size")).toHaveTextContent(en.layout.sizeCells(3, 2));
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(7, 2) });
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 0, w: 3, h: 2 });
    expect(steps()).toBe(1);
    click(8, 8);
    expect(screen.queryByTestId("room-handles")).not.toBeInTheDocument();
  });

  it("draws rooms with the Room tool and doors with the Door tool", () => {
    press("KeyW");
    expect(canvas()).toHaveAttribute("data-tool", "room");
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(0.5, 1.5) });
    fireEvent.pointerMove(canvas(), screenAt(1.5, 1.5));
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(1.5, 1.5) });
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: 0, y: 1, w: 2, h: 1 });

    press("KeyE");
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

  it("draws a room that cannot go there in red and says why", () => {
    press("KeyW");
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(0.5, 1.5) });
    fireEvent.pointerMove(canvas(), screenAt(1.5, 0.5));
    const ghost = screen.getByTestId("ghost");
    expect(ghost).toHaveAttribute("data-ok", "false");
    expect(ghost.querySelector("rect")).toHaveClass("cv-ghost--bad");
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(1.5, 0.5) });
    expect(ship().layout.rooms).toHaveLength(3);
    expect(screen.getByText(en.layout.problems.overlap)).toBeInTheDocument();

    expect(steps()).toBe(0);
  });

  it("draws rooms left of and above the first room, and shows their place from it", () => {
    press("KeyW");
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(-0.5, -0.5) });
    fireEvent.pointerMove(canvas(), screenAt(-0.5, 1.5));
    expect(screen.getByTestId("ghost")).toHaveAttribute("data-ok", "true");
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(-0.5, 1.5) });
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: -1, y: -1, w: 1, h: 3 });
    expect(steps()).toBe(1);
    expect(screen.getByTestId("room-3")).toBeInTheDocument();
    // The new room is the leftmost and topmost: it is at 0, 0, and room 0 at 1, 1.
    expect(within(inspector()).getByLabelText(en.inspector.x)).toHaveValue(0);
    expect(within(inspector()).getByLabelText(en.inspector.y)).toHaveValue(0);
    press("KeyQ");
    click(0.5, 0.5);
    expect(within(inspector()).getByLabelText(en.inspector.x)).toHaveValue(1);
    expect(within(inspector()).getByLabelText(en.inspector.y)).toHaveValue(1);
  });

  it("draws a room past the right edge in amber and says it is out of sight in battle", () => {
    press("KeyW");
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(17.5, 3.5) });
    fireEvent.pointerMove(canvas(), screenAt(18.5, 3.5));
    expect(screen.getByTestId("ghost")).toHaveAttribute("data-ok", "true");
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(18.5, 3.5) });
    expect(ship().layout.rooms[3]).toMatchObject({ x: 17, y: 3, w: 2, h: 1 });
    expect(screen.getByText(en.layout.outOfView)).toBeInTheDocument();
    const marked = screen.getByTestId("room-out-3");
    expect(marked.querySelector(".cv-room-out")).not.toBeNull();
    expect(marked.querySelector(".cv-room-out-part")).toHaveAttribute(
      "clip-path",
      "url(#cv-outside-frame)"
    );
    // Rooms inside are not marked; a room above the frame (from an opened ship) is marked red.
    expect(screen.queryByTestId("room-out-0")).toBeNull();
    act(() => state().edit((s) => addRoom(s, { x: 6, y: -3, w: 1, h: 1 })));
    expect(screen.getByTestId("room-off-4").querySelector(".cv-room-off")).not.toBeNull();
  });

  it("refuses a room above the frame the game shows, in red, and says why", () => {
    press("KeyW");
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(2.5, -0.5) });
    fireEvent.pointerMove(canvas(), screenAt(3.5, -1.5));
    expect(screen.getByTestId("ghost")).toHaveAttribute("data-ok", "false");
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(3.5, -1.5) });
    expect(ship().layout.rooms).toHaveLength(3);
    expect(screen.getByText(en.layout.problems.offScreen)).toBeInTheDocument();
    expect(steps()).toBe(0);
    // The inspector refuses it too.
    press("KeyQ");
    click(4.5, 0.5);
    commitField(en.inspector.y, "-2");
    expect(within(inspector()).getByRole("alert")).toHaveTextContent(en.layout.problems.offScreen);
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 0 });
  });

  it("saves rooms at negative cells and shows them at the same place when reopened", () => {
    press("KeyW");
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(-0.5, -0.5) });
    fireEvent.pointerMove(canvas(), screenAt(1.5, -0.5));
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(1.5, -0.5) });
    const drawn = ship();
    expect(drawn.layout.rooms[3]).toMatchObject({ x: -1, y: -1 });
    const place = () =>
      [0, 1, 2, 3].map((id) => {
        const rect = screen.getByTestId(`room-${id}`).querySelector("rect")!;
        return [rect.getAttribute("x"), rect.getAttribute("y")];
      });
    const frame = () => {
      const r = screen.getByTestId("view-limit");
      return [r.getAttribute("x"), r.getAttribute("y")];
    };
    const before = { rooms: place(), frame: frame(), hangar: hangarShipOffset(drawn.layout) };

    const reopened = loadShip(saveShip(drawn));
    expect(reopened.layout.rooms[3]).toMatchObject({ x: 0, y: 0 });
    expect(reopened.layout.rooms[0]).toMatchObject({ x: 1, y: 1 });
    // The anchor moved to the top-left room, and it is never negative.
    expect([reopened.layout.xOffset, reopened.layout.yOffset]).toEqual([0, 0]);
    act(() =>
      state().openDocument({
        ship: reopened,
        art: { source: memorySource({}), gibs: [] },
        saved: true,
      })
    );
    act(() => state().setWorkspace("rooms"));
    expect({ rooms: place(), frame: frame(), hangar: hangarShipOffset(reopened.layout) }).toEqual(
      before
    );
  });

  it("says why a dragged room cannot go where it is dropped", () => {
    click(4.5, 0.5);
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(4.5, 0.5) });
    fireEvent.pointerMove(canvas(), screenAt(3.5, 0.5));
    expect(screen.getByTestId("ghost")).toHaveAttribute("data-ok", "false");
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(3.5, 0.5) });
    expect(ship().layout.rooms[2]).toMatchObject({ x: 4, y: 0 });
    expect(screen.getByText(en.layout.problems.overlap)).toBeInTheDocument();
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

describe("Rooms: copy and paste", () => {
  const ctrl = (code: string) => press(code, { ctrlKey: true });
  const ghostRects = () => [...screen.getByTestId("ghost").querySelectorAll("rect")];

  it("pastes copied rooms that follow the pointer until a click places them", () => {
    click(4.5, 0.5);
    ctrl("KeyC");
    expect(state().clipboard.rooms?.rooms).toEqual([{ x: 4, y: 0, w: 1, h: 1 }]);
    fireEvent.pointerMove(canvas(), screenAt(6.5, 3.5));
    ctrl("KeyV");
    expect(screen.getByTestId("ghost")).toHaveAttribute("data-ok", "true");
    const before = ghostRects()[0].getAttribute("x");
    fireEvent.pointerMove(canvas(), screenAt(8.5, 3.5));
    expect(ghostRects()[0].getAttribute("x")).not.toBe(before);
    // Over a room it shows red, and a click there is refused.
    fireEvent.pointerMove(canvas(), screenAt(0.5, 0.5));
    expect(screen.getByTestId("ghost")).toHaveAttribute("data-ok", "false");
    click(0.5, 0.5);
    expect(screen.getByText(en.layout.problems.overlap)).toBeInTheDocument();
    expect(steps()).toBe(0);
    fireEvent.pointerMove(canvas(), screenAt(8.5, 3.5));
    click(8.5, 3.5);
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: 8, y: 3, w: 1, h: 1 });
    expect(state().selection.rooms).toEqual([3]);
    expect(steps()).toBe(1);
    expect(screen.queryByTestId("ghost")).not.toBeInTheDocument();
  });

  it("cancels pasting with Esc or a right click", () => {
    click(4.5, 0.5);
    fireEvent.pointerMove(canvas(), screenAt(8.5, 3.5));
    ctrl("KeyD");
    expect(screen.getByTestId("ghost")).toBeInTheDocument();
    press("Escape");
    expect(screen.queryByTestId("ghost")).not.toBeInTheDocument();
    ctrl("KeyD");
    fireEvent.pointerDown(canvas(), { button: 2, ...screenAt(8.5, 3.5) });
    expect(state().pasting).toBeNull();
    expect(steps()).toBe(0);
  });

  it("duplicates from the inspector next to the original", () => {
    click(4.5, 0.5);
    fireEvent.click(within(inspector()).getByRole("button", { name: en.clipboard.duplicate }));
    expect(ship().layout.rooms[3]).toEqual({ id: 3, x: 5, y: 0, w: 1, h: 1 });
    expect(steps()).toBe(1);
  });

  it("leaves the keys to a text field, and does nothing while a dialog is open", () => {
    click(4.5, 0.5);
    const field = within(inspector()).getByLabelText(en.inspector.x);
    field.focus();
    act(() => {
      fireEvent.keyDown(field, { code: "KeyC", ctrlKey: true });
      fireEvent.keyDown(field, { code: "KeyD", ctrlKey: true });
    });
    expect(state().clipboard).toEqual({});
    expect(steps()).toBe(0);
    field.blur();
    act(() => state().openDialog("settings"));
    ctrl("KeyC");
    ctrl("KeyD");
    expect(state().clipboard).toEqual({});
    expect(steps()).toBe(0);
  });
});

describe("Rooms inspector", () => {
  it("edits a room's values and refuses invalid ones with a message", () => {
    click(4.5, 0.5);
    commitField(en.inspector.y, "2");
    expect(ship().layout.rooms[2]).toMatchObject({ y: 2 });
    // Left of every other room: it becomes the leftmost one, at 0.
    commitField(en.inspector.x, "-1");
    expect(ship().layout.rooms[2]).toMatchObject({ x: -1, y: 2 });
    expect(within(inspector()).getByLabelText(en.inspector.x)).toHaveValue(0);
    commitField(en.inspector.y, "0");
    commitField(en.inspector.width, "2");
    expect(within(inspector()).getByRole("alert")).toHaveTextContent(en.layout.problems.overlap);
    expect(within(inspector()).getByLabelText(en.inspector.width)).toHaveValue(1);
    expect(ship().layout.rooms[2]).toMatchObject({ x: -1, y: 0, w: 1 });
    expect(steps()).toBe(3);
  });

  it("shows the palette when nothing is selected, and the tool help folded", () => {
    const panel = inspector();
    expect(within(panel).getByText(en.inspector.nothingSelected)).toBeInTheDocument();
    const add = within(panel).getByRole("region", { name: en.sections.addSystem });
    expect(within(add).getByRole("group", { name: en.systems.groups.core })).toBeInTheDocument();
    expect(within(add).getByText(en.systems.help)).toBeInTheDocument();
    const help = within(panel).getByRole("button", {
      name: en.common.withKey(en.toolHelp.rooms.select.title, "Q"),
    });
    expect(help).toHaveAttribute("aria-expanded", "false");
  });

  it("shows a selected room's systems, the palette and its position, in that order", () => {
    click(2.5, 1.5);
    const panel = inspector();
    expect(within(panel).getByText(en.inspector.roomWith(1, "pilot"))).toBeInTheDocument();
    const sections = within(panel)
      .getAllByRole("region")
      .filter((r) => r.classList.contains("sec"))
      .map((r) => r.getAttribute("aria-label"));
    expect(sections.slice(0, 3)).toEqual([
      en.sections.roomSystems,
      en.sections.addSystem,
      en.sections.position,
    ]);
    const systems = within(panel).getByRole("region", { name: en.sections.roomSystems });
    expect(within(systems).getByRole("region", { name: "pilot" })).toBeInTheDocument();
    const add = within(panel).getByRole("region", { name: en.sections.addSystem });
    expect(within(add).getByText(en.systems.helpRoom)).toBeInTheDocument();
    expect(within(panel).getByText(en.inspector.doorsOnWalls(3))).toBeInTheDocument();
  });

  it("puts a pictogram before each section title, next to the title", () => {
    click(2.5, 1.5);
    const heads = [...inspector().querySelectorAll(".sec-head")];
    expect(heads.map((h) => h.querySelector(".pict")?.getAttribute("data-pictogram"))).toEqual([
      "roomSystems",
      "addSystem",
      "position",
      "select",
    ]);
    for (const head of heads) {
      expect(head.querySelector(".pict")).toHaveAttribute("aria-hidden", "true");
      expect(head.querySelector(".sec-title")?.textContent).not.toBe("");
    }
    expect(
      within(inspector()).getByRole("button", { name: en.sections.position })
    ).toBeInTheDocument();
    press("KeyR");
    expect(inspector().querySelector('.sec-head [data-pictogram="station"]')).not.toBeNull();
  });

  it("turns a crew station from its system's card", () => {
    click(2.5, 1.5);
    const card = within(inspector()).getByRole("region", { name: "pilot" });
    expect(within(card).getByText(en.systems.station(1))).toBeInTheDocument();
    const facing = within(card).getByRole("group", { name: en.inspector.facing });
    expect(
      within(facing).getByRole("button", { name: en.inspector.directions.right })
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(facing).getByRole("button", { name: en.inspector.directions.down }));
    expect(screen.getByTestId("station-0")).toHaveAttribute("data-direction", "down");
    expect(ship().blueprint.systems[0].slot).toEqual({ number: 1, direction: "down" });
    expect(steps()).toBe(1);
  });

  it("asks before deleting a room with systems", async () => {
    const texts = en.layout.confirmDelete;
    click(2.5, 1.5);
    const ask = () => {
      fireEvent.click(within(inspector()).getByRole("button", { name: en.inspector.delete }));
      return screen.findByRole("dialog", { name: texts.title });
    };

    let dialog = await ask();
    expect(within(dialog).getByText(texts.message(1))).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: en.common.cancel })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: en.common.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(ship().layout.rooms).toHaveLength(3);

    dialog = await ask();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(ship().layout.rooms).toHaveLength(3);
    expect(steps()).toBe(0);

    dialog = await ask();
    const confirm = within(dialog).getByRole("button", { name: texts.confirm });
    expect(confirm).toHaveClass("btn--destructive");
    fireEvent.click(confirm);
    await waitFor(() => expect(ship().layout.rooms).toHaveLength(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(steps()).toBe(1);
  });

  it("asks from the Delete key too", async () => {
    click(2.5, 1.5);
    press("Delete");
    const dialog = await screen.findByRole("dialog", { name: en.layout.confirmDelete.title });
    fireEvent.click(within(dialog).getByRole("button", { name: en.layout.confirmDelete.confirm }));
    await waitFor(() => expect(ship().layout.rooms).toHaveLength(2));
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
    press("KeyR");
    const chooser = within(inspector()).getByRole("group", { name: en.inspector.stationFor });
    fireEvent.click(within(chooser).getByRole("radio", { name: /shields/ }));
    expect(state().stationSystem).toBe(1);
    click(0.5, 0.5);
    expect(ship().blueprint.systems[1].slot).toEqual({ number: 0, direction: "left" });
  });

  it("shows help for the current tool", () => {
    expect(
      within(inspector()).getByText(en.common.withKey(en.toolHelp.rooms.select.title, "Q"))
    ).toBeInTheDocument();
    press("KeyE");
    expect(
      within(inspector()).getByText(en.common.withKey(en.toolHelp.rooms.door.title, "E"))
    ).toBeInTheDocument();
  });
});
