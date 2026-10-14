// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addMount, type Point } from "../core";
import { addGib } from "../app/art/gibs";
import { gamePicture } from "../app/art/model";
import { useEditor } from "../app/store";
import { gibRectPx } from "../canvas/artHitTest";
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

describe("Hull: pictures", () => {
  it("lists the ship's pictures and changes the hull from the game's pictures", async () => {
    const panel = within(inspector()).getByRole("region", { name: en.sections.pictures });
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
    const panel = within(inspector()).getByRole("region", { name: en.sections.pictures });
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

describe("Hull: mounts and gibs", () => {
  it("adds a mount with the Mount tool and edits it", () => {
    press("KeyT");
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

describe("Hull: the Gib tool's view", () => {
  it("shows only the hull and the gibs while the Gib tool is chosen", async () => {
    act(() =>
      state().edit((s) => addMount(s, { x: 40, y: 40, rotate: false, mirror: false, gib: 0 }))
    );
    const svg = screen.getByTestId("ship-svg");
    await screen.findByTestId("hull-picture");
    await waitFor(() => expect(svg.querySelector(".cv-floor")).not.toBeNull());
    const drawn = () => ({
      rooms: svg.querySelector(".cv-room") !== null,
      doors: screen.queryByTestId("door-0") !== null,
      grid: svg.querySelector(".cv-grid") !== null,
      floor: svg.querySelector(".cv-floor") !== null,
      mounts: screen.queryByTestId("mount-1") !== null,
      hull: screen.queryByTestId("hull-picture") !== null,
      gibs: screen.queryByTestId("gib-1") !== null,
    });
    const layers = state().view.layers;
    expect(drawn()).toEqual({
      rooms: true,
      doors: true,
      grid: true,
      floor: true,
      mounts: true,
      hull: true,
      gibs: false,
    });

    press("KeyG");
    await screen.findByTestId("gib-1");
    expect(drawn()).toEqual({
      rooms: false,
      doors: false,
      grid: false,
      floor: false,
      mounts: false,
      hull: true,
      gibs: true,
    });
    expect(screen.queryByTestId("shield-ellipse")).toBeNull();
    expect(state().view.layers).toBe(layers);

    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt({ x: 150, y: 40 }) });
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt({ x: 150, y: 40 }) });
    expect(screen.getByTestId("gib-selected-2")).toBeInTheDocument();

    press("KeyQ");
    await waitFor(() => expect(svg.querySelector(".cv-floor")).not.toBeNull());
    expect(drawn()).toEqual({
      rooms: true,
      doors: true,
      grid: true,
      floor: true,
      mounts: true,
      hull: true,
      gibs: false,
    });
  });

  it("says so in the Layers menu, which keeps the choices", () => {
    press("KeyG");
    fireEvent.click(screen.getByRole("button", { name: en.canvas.layers }));
    const menu = screen.getByRole("group", { name: en.canvas.layers });
    expect(within(menu).getByText(en.canvas.gibToolLayers)).toBeInTheDocument();
    expect(within(menu).getByRole("checkbox", { name: en.canvas.layerNames.rooms })).toBeChecked();
    press("Digit2");
    expect(within(menu).queryByText(en.canvas.gibToolLayers)).toBeNull();
  });
});

describe("Hull: a gib gone from under the pointer", () => {
  const hoverGib = (index: number) => {
    const r = gibRectPx(snap().ship, snap().art, index);
    fireEvent.pointerMove(canvas(), screenAt({ x: r.x + r.w / 2, y: r.y + r.h / 2 }));
    expect(screen.getByTestId("hover")).toBeInTheDocument();
  };

  it("keeps the editor when the hovered gib is deleted, undone and redone", async () => {
    press("KeyG");
    await screen.findByTestId("gib-2");
    fireEvent.pointerDown(canvas(), { button: 0, ...screenAt({ x: 150, y: 40 }) });
    fireEvent.pointerUp(canvas(), { button: 0, ...screenAt({ x: 150, y: 40 }) });
    hoverGib(1);
    press("Delete");
    expect(snap().ship.layoutXml.gibs).toHaveLength(1);
    expect(screen.queryByTestId("hover")).toBeNull();
    act(() => state().undo());
    expect(await screen.findByTestId("gib-2")).toBeInTheDocument();
    act(() => state().redo());
    expect(screen.getByTestId("ship-svg")).toBeInTheDocument();
  });

  it("keeps the editor when a new gib under the pointer is undone", async () => {
    press("KeyG");
    act(() => state().editSnapshot((s) => addGib(s, gamePicture("img/ship/t_gib1.png"))));
    expect(await screen.findByTestId("gib-3")).toBeInTheDocument();
    hoverGib(2);
    act(() => state().undo());
    expect(screen.queryByTestId("gib-3")).toBeNull();
    expect(screen.getByRole("button", { name: en.art.playExplosion })).toBeInTheDocument();
  });
});

describe("Hull: explosion pieces", () => {
  it("lists the gibs, selects one with a click and removes another in one step", () => {
    const gibs = within(inspector()).getByRole("region", { name: en.sections.gibs });
    expect(within(gibs).getByRole("button", { name: /Explosion pieces/ })).toHaveTextContent("2");
    fireEvent.click(within(gibs).getByRole("button", { name: en.art.selectGib(2) }));
    expect(state().selection.gibs).toEqual([1]);
    press("Escape");
    const list = within(inspector()).getByRole("region", { name: en.sections.gibs });
    fireEvent.click(
      within(list).getByRole("button", { name: en.art.removeNamed(en.art.gibName(1)) })
    );
    expect(snap().ship.layoutXml.gibs).toHaveLength(1);
    expect(steps()).toBe(1);
    expect(within(inspector()).getByRole("button", { name: en.art.addGib })).toBeInTheDocument();
  });
});

describe("Hull: pictograms", () => {
  it("puts a pictogram before each section title", () => {
    press("KeyH");
    const heads = [...inspector().querySelectorAll(".sec-head")];
    expect(heads.map((h) => h.querySelector(".pict")?.getAttribute("data-pictogram"))).toEqual([
      "movePicture",
      "pictures",
      "mounts",
      "gibs",
      "movePicture",
    ]);
    expect(heads.map((h) => h.querySelector(".sec-title")?.textContent)).toEqual([
      en.art.moveWhich,
      en.sections.pictures,
      en.sections.mounts,
      en.sections.gibs,
      en.common.withKey(en.toolHelp.hull.movePicture.title, "H"),
    ]);
  });
});

describe("Hull: picture zoom", () => {
  it("shows a thumbnail large, with its name and size, while it is hovered", async () => {
    const hull = within(inspector()).getByRole("button", {
      name: en.art.changeNamed("Hull"),
    }).parentElement!;
    const thumb = hull.querySelector<HTMLElement>(".ar-thumb")!;
    await waitFor(() => expect(thumb.querySelector("img")).not.toBeNull());
    fireEvent.pointerEnter(thumb);
    const zoom = screen.getByRole("tooltip");
    expect(within(zoom).getByRole("region", { name: "Hull" })).toHaveTextContent(
      en.art.pictureSize(200, 100)
    );
    expect(zoom.querySelector("img.zoom-img")).not.toBeNull();
    fireEvent.pointerLeave(thumb);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("Hull checks", () => {
  it("opens Hull with the mount selected from the overview", () => {
    act(() =>
      state().edit((s) => addMount(s, { x: 40, y: 40, rotate: false, mirror: false, gib: 9 }))
    );
    press("Digit2");
    fireEvent.click(screen.getByRole("button", { name: /^Overview/ }));
    const item = en.overview.items.mountGibs.title;
    fireEvent.click(screen.getByRole("button", { name: en.overview.goThereLabel(item) }));
    expect(state().workspace).toBe("hull");
    expect(state().selection.mounts).toEqual([0]);
    expect(within(inspector()).getByText(en.art.selectedMount)).toBeInTheDocument();
  });
});

describe("Hull: the mount list", () => {
  it("lists the mounts with their weapons, selects one with a click and removes another", () => {
    act(() =>
      state().edit((s) => {
        const one = addMount(s, { x: 40, y: 40, rotate: false, mirror: false, gib: 0 });
        const two = addMount(one, { x: 80, y: 40, rotate: false, mirror: false, gib: 0 });
        return {
          ...two,
          blueprint: { ...two.blueprint, weaponList: { items: ["ARTILLERY_FED"], missiles: 0 } },
        };
      })
    );
    const list = within(inspector()).getByRole("region", { name: en.sections.mounts });
    expect(list).toHaveTextContent(en.sections.count(2, 8));
    expect(within(list).getByText(en.sections.mountsHint("T"))).toBeInTheDocument();
    const first = within(list).getByRole("button", { name: en.art.selectMount(1) });
    expect(first).toHaveTextContent(en.art.mount(1));
    expect(first).toHaveTextContent("ARTILLERY_FED");
    const second = within(list).getByRole("button", { name: en.art.selectMount(2) });
    expect(second).toHaveTextContent(en.art.mountEmpty);

    fireEvent.click(second);
    expect(state().selection.mounts).toEqual([1]);
    expect(within(inspector()).getByText(en.art.selectedMount)).toBeInTheDocument();
    press("Escape");

    const before = steps();
    fireEvent.click(
      within(inspector()).getByRole("button", { name: en.art.removeNamed(en.art.mount(1)) })
    );
    expect(snap().ship.layoutXml.mounts).toEqual([
      { x: 80, y: 40, rotate: false, mirror: false, gib: 0 },
    ]);
    expect(steps()).toBe(before + 1);
    expect(
      within(inspector()).queryByRole("button", { name: en.art.selectMount(2) })
    ).not.toBeInTheDocument();
  });
});
