// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addRoom, updateBlueprint, type Ship } from "../core";
import { selectionOf } from "../app/selection";
import { FLASH_MS, useEditor } from "../app/store";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { completeShip, fullArt, openCompleteShip } from "../testing/overviewFixtures";
import { App } from "./App";

const state = () => useEditor.getState();
const t = en.overview;

async function setUp(...args: Parameters<typeof openCompleteShip>) {
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
  openCompleteShip(...args);
  render(<App platform={createFakePlatform()} />);
  await waitFor(() => expect(state().view.camera.x).not.toBe(0));
}

/** Opens the Overview and clicks the Go there link of an item. */
function goTo(title: string) {
  fireEvent.click(screen.getByRole("button", { name: /^Overview/ }));
  const dialog = screen.getByRole("dialog", { name: t.title });
  fireEvent.click(within(dialog).getByRole("button", { name: t.goThereLabel(title) }));
  expect(screen.queryByRole("dialog")).toBeNull();
}

const flashed = () => [...document.querySelectorAll("[data-flashed]")];
const notice = () => document.querySelector(".notice--issue") as HTMLElement | null;

/** Lets the flash run out. */
function endFlash() {
  act(() => vi.advanceTimersByTime(FLASH_MS));
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("going to an Overview item", () => {
  it("unfolds a folded section, flashes the field and shows the item's text", async () => {
    await setUp(updateBlueprint(completeShip(), { health: 0 }));
    vi.useFakeTimers();
    act(() => {
      state().setSectionOpen("ship-stats", false);
      state().setWorkspace("hull");
    });
    goTo(t.items.hullReactor.title);

    expect(state().workspace).toBe("ship");
    expect(state().openSections["ship-stats"]).toBe(true);
    const stats = screen.getByRole("region", { name: en.sections.stats });
    const field = stats.querySelector('[data-field="hull"]')!;
    expect(flashed()).toEqual([field]);
    expect(within(field as HTMLElement).getByText(en.loadout.hull)).toBeInTheDocument();

    const bar = notice()!;
    expect(bar).toHaveClass("notice--problem");
    expect(bar).toHaveTextContent(t.status.problem + t.items.hullReactor.title);
    expect(bar).toHaveTextContent(t.items.hullReactor.explain);

    endFlash();
    expect(flashed()).toEqual([]);
    expect(state().flash).toBeNull();
    // The text stays until it is closed.
    expect(notice()).not.toBeNull();
    fireEvent.click(within(bar).getByRole("button", { name: en.common.close }));
    expect(notice()).toBeNull();
  });

  it("selects a room, flashes it on the canvas and brings it into view", async () => {
    // A room no door leads to, far from the rest.
    const ship: Ship = addRoom(completeShip(), { x: 30, y: 20, w: 2, h: 1 });
    await setUp(ship);
    vi.useFakeTimers();
    act(() => state().setCamera({ x: 0, y: 0, scale: 1 }));
    goTo(t.items.reach.title);

    expect(state().workspace).toBe("rooms");
    expect(state().selection).toEqual(selectionOf({ kind: "room", id: 4 }));
    const rings = screen.getByTestId("flash-rings").querySelectorAll("rect");
    expect(rings).toHaveLength(1);
    // The room (ship pixels 31·35 .. 33·35 across) now lies in the 800 × 600 view.
    const { x, scale } = state().view.camera;
    expect(31 * 35 * scale + x).toBeGreaterThanOrEqual(48);
    expect(33 * 35 * scale + x).toBeLessThanOrEqual(800 - 48);
    expect(notice()).toHaveTextContent(t.items.reach.explain);
    expect(notice()).toHaveTextContent(en.checks.messages["rooms-cut-off"]({ rooms: [4] }));

    endFlash();
    expect(screen.queryByTestId("flash-rings")).toBeNull();
    expect(state().selection).toEqual(selectionOf({ kind: "room", id: 4 }));
  });

  it("selects a mount and flashes the field of its gib", async () => {
    const ship = completeShip();
    const mounts = ship.layoutXml.mounts.map((m, i) => (i === 1 ? { ...m, gib: 5 } : m));
    await setUp({ ...ship, layoutXml: { ...ship.layoutXml, mounts } });
    vi.useFakeTimers();
    goTo(t.items.mountGibs.title);

    expect(state().workspace).toBe("hull");
    expect(state().selection).toEqual(selectionOf({ kind: "mount", index: 1 }));
    expect(flashed().map((e) => e.getAttribute("data-field"))).toEqual(["mountGib"]);
    expect(screen.getByTestId("flash-rings").querySelectorAll("rect")).toHaveLength(1);
    endFlash();
    expect(flashed()).toEqual([]);
  });

  it("flashes a picture's field in the Pictures section", async () => {
    await setUp(completeShip(), { ...fullArt(), shield: undefined });
    vi.useFakeTimers();
    goTo(t.items.shield.title);

    expect(state().workspace).toBe("hull");
    expect(state().openSections["art-pictures"]).toBe(true);
    const field = flashed();
    expect(field.map((e) => e.getAttribute("data-field"))).toEqual(["picture:shield"]);
    expect(field[0].closest('[data-section="art-pictures"]')).not.toBeNull();
    expect(notice()).toHaveClass("notice--check");
    expect(notice()).toHaveTextContent(t.status.check + t.items.shield.title);
  });

  it("flashes the section of an item without a field or object", async () => {
    await setUp(updateBlueprint(completeShip(), { crew: [] }));
    vi.useFakeTimers();
    goTo(t.items.crew.title);

    expect(state().openSections["ship-crew"]).toBe(true);
    expect(flashed()).toEqual([screen.getByRole("region", { name: en.sections.crew })]);
    expect(state().selection).toEqual(selectionOf());
    endFlash();
    expect(flashed()).toEqual([]);
  });

  it("goes there with Enter on a focused item", async () => {
    await setUp(updateBlueprint(completeShip(), { crew: [] }));
    fireEvent.click(screen.getByRole("button", { name: /^Overview/ }));
    const card = screen.getByRole("dialog").querySelector(".ov-card") as HTMLElement;
    card.focus();
    expect(card).toHaveFocus();
    fireEvent.keyDown(card, { key: "Enter" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state().workspace).toBe("ship");
    expect(state().flash?.section).toBe("ship-crew");
  });

  it("turns the hangar preview off to show the place", async () => {
    await setUp(updateBlueprint(completeShip(), { crew: [] }));
    act(() => state().setHangarPreview(true));
    goTo(t.items.crew.title);
    expect(state().view.hangarPreview).toBe(false);
  });
});
