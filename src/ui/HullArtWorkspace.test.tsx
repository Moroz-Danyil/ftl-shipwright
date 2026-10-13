// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Point } from "../core";
import { useEditor } from "../app/store";
import { en } from "../text/en";
import { openArtShip } from "../testing/artFixtures";
import { createFakePlatform, type FakePlatform } from "../testing/fakePlatform";
import { pngHeader } from "../testing/systemsFixtures";
import { App } from "./App";

const state = () => useEditor.getState();
const snap = () => state().doc!.history.present;
const steps = () => state().doc!.history.past.length;
const canvas = () => screen.getByRole("main", { name: en.canvas.label });
const inspector = () => screen.getByRole("complementary", { name: en.inspector.label });

/** Screen position of a ship pixel. */
function screenAt(p: Point) {
  const { camera } = state().view;
  return { clientX: p.x * camera.scale + camera.x, clientY: p.y * camera.scale + camera.y };
}

function press(code: string) {
  act(() => {
    fireEvent.keyDown(window, { code });
    fireEvent.keyUp(window, { code });
  });
}

function drag(from: Point, to: Point) {
  fireEvent.pointerDown(canvas(), { button: 0, ...screenAt(from) });
  fireEvent.pointerMove(canvas(), screenAt({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }));
  fireEvent.pointerMove(canvas(), screenAt(to));
  fireEvent.pointerUp(canvas(), { button: 0, ...screenAt(to) });
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
  openArtShip();
  platform = createFakePlatform();
  render(<App platform={platform} />);
  await waitFor(() =>
    expect(screen.getByTestId("ship-svg").querySelector(".cv-grid")).not.toBeNull()
  );
  press("Digit3");
});

afterEach(() => vi.restoreAllMocks());

describe("Hull & art pictures", () => {
  it("lists the ship's pictures and changes the hull from the game's pictures", async () => {
    const panel = within(inspector()).getByRole("region", { name: en.art.pictures });
    expect(panel).toHaveTextContent("t_base.png");
    expect(panel).toHaveTextContent("t_floor.png");
    expect(await screen.findByTestId("hull-picture")).toBeInTheDocument();

    fireEvent.click(
      within(panel).getByRole("button", { name: en.art.changeNamed(en.art.slots.hull) })
    );
    const dialog = screen.getByRole("dialog", { name: en.art.choose(en.art.slots.hull) });
    expect(
      await within(dialog).findByRole("option", { name: /big_base\.png/ })
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "big" } });
    expect(within(dialog).queryByRole("option", { name: /t_base\.png/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole("option", { name: /big_base\.png/ }));
    await waitFor(() => expect(snap().ship.layoutXml.img.w).toBe(300));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("takes a picture from a PNG file and removes optional ones", async () => {
    await platform.writeFile("art/shield.png", pngHeader(500, 300));
    platform.answers.pickFile.push("art/shield.png");
    const panel = within(inspector()).getByRole("region", { name: en.art.pictures });
    fireEvent.click(
      within(panel).getByRole("button", { name: en.art.changeNamed(en.art.slots.shield) })
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: en.art.fromFile })
    );
    await waitFor(() => expect(snap().art.shield?.kind).toBe("file"));
    expect(snap().ship.layout.ellipse).toMatchObject({ halfWidth: 250, halfHeight: 150 });
    expect(panel).toHaveTextContent("shield.png");
    fireEvent.click(
      within(panel).getByRole("button", { name: en.art.removeNamed(en.art.slots.floor) })
    );
    expect(snap().art.floor).toBeUndefined();
    expect(steps()).toBe(2);
  });

  it("moves the hull with the Move picture tool, keeping the mounts in place when asked", () => {
    press("KeyH");
    drag({ x: 215, y: 105 }, { x: 220, y: 108 });
    expect(snap().ship.layoutXml.img).toMatchObject({ x: -5, y: -17 });
    fireEvent.click(within(inspector()).getByRole("checkbox", { name: en.art.keepMounts }));
    expect(state().artTool.keepMounts).toBe(true);
    fireEvent.click(within(inspector()).getByRole("radio", { name: en.art.slots.floor }));
    drag({ x: 75, y: 60 }, { x: 77, y: 60 });
    expect(snap().ship.layoutXml.floorOffset).toEqual({ x: 2, y: 0 });
    expect(steps()).toBe(2);
  });
});

describe("Hull & art mounts and gibs", () => {
  it("adds a mount with the Mount tool and edits it", () => {
    press("KeyM");
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt({ x: 75, y: 95 }) });
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt({ x: 75, y: 95 }) });
    expect(snap().ship.layoutXml.mounts).toEqual([
      { x: 50, y: 80, rotate: true, mirror: false, gib: 0, slide: "down" },
    ]);
    expect(screen.getByTestId("mount-1")).toHaveAttribute("data-selected", "true");
    const panel = inspector();
    expect(within(panel).getByText(en.art.mount(1))).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: en.art.later })).toBeDisabled();
    fireEvent.click(within(panel).getByRole("button", { name: en.art.mirror }));
    expect(snap().ship.layoutXml.mounts[0].mirror).toBe(true);
    press("BracketLeft");
    expect(snap().ship.layoutXml.mounts[0].rotate).toBe(false);
    fireEvent.change(within(panel).getByRole("combobox", { name: en.art.gib }), {
      target: { value: "2" },
    });
    expect(snap().ship.layoutXml.mounts[0].gib).toBe(2);
    drag({ x: 75, y: 95 }, { x: 85, y: 95 });
    expect(snap().ship.layoutXml.mounts[0]).toMatchObject({ x: 60, y: 80 });
    expect(steps()).toBe(5);
  });

  it("shows, selects and edits gibs with the Gib tool", async () => {
    press("KeyG");
    expect(await screen.findByTestId("gib-2")).toBeInTheDocument();
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt({ x: 150, y: 40 }) });
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt({ x: 150, y: 40 }) });
    expect(state().selection.gibs).toEqual([1]);
    const panel = inspector();
    expect(within(panel).getByText(en.art.gibName(2))).toBeInTheDocument();
    const velocity = within(panel).getByRole("group", { name: en.art.velocity });
    const min = within(velocity).getByLabelText(en.art.min);
    fireEvent.change(min, { target: { value: "0.25" } });
    fireEvent.keyDown(min, { key: "Enter" });
    expect(snap().ship.layoutXml.gibs[1].velocity).toEqual({ min: 0.25, max: 1 });
    press("Delete");
    expect(snap().ship.layoutXml.gibs).toHaveLength(1);
  });

  it("plays the explosion preview", async () => {
    await screen.findByTestId("hull-picture");
    fireEvent.click(screen.getByRole("button", { name: en.art.playExplosion }));
    await waitFor(() => expect(screen.queryByTestId("hull-picture")).toBeNull());
    expect(await screen.findByTestId("gib-1")).toBeInTheDocument();
  });
});
