// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditor } from "../app/store";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { pilot, shields } from "../testing/layoutFixtures";
import { openSystemsShip } from "../testing/systemsFixtures";
import { SystemIcon } from "./common/SystemIcon";
import { App } from "./App";

const state = () => useEditor.getState();
const svg = () => screen.getByTestId("ship-svg");

function toggleLayer(name: string) {
  fireEvent.click(screen.getByRole("button", { name: en.canvas.layers }));
  fireEvent.click(screen.getByRole("checkbox", { name }));
  fireEvent.click(screen.getByRole("button", { name: en.canvas.layers }));
}

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
  openSystemsShip([{ ...shields, img: "room_shields" }, pilot]);
  render(<App platform={createFakePlatform()} />);
  await waitFor(() => expect(state().view.camera.x).not.toBe(0));
});

afterEach(() => vi.restoreAllMocks());

describe("the ship as the game draws it", () => {
  it("draws rooms with tiles and walls, interiors, icons, door sprites and crew", async () => {
    expect(svg().querySelectorAll(".cv-room-wall")).toHaveLength(3);
    expect(svg().querySelectorAll(".cv-room-tiles")).toHaveLength(3);
    expect(await screen.findByTestId("interior-room_shields")).toHaveAttribute("width", "70");
    expect(await screen.findByTestId("system-icon-shields")).toBeInTheDocument();
    await waitFor(() => expect(svg().querySelectorAll(".cv-door-sprite")).toHaveLength(4));
    expect(screen.getByTestId("door-2").querySelector(".cv-door-mark--airlock")).not.toBeNull();
    expect(screen.getByTestId("door-0").querySelector(".cv-door-mark")).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId("station-1").querySelector("svg")).not.toBeNull()
    );
  });

  it("toggles interiors, icons and crew with the Layers menu", async () => {
    await screen.findByTestId("system-icon-shields");
    toggleLayer(en.canvas.layerNames.interiors);
    expect(screen.queryByTestId("interior-room_shields")).toBeNull();
    toggleLayer(en.canvas.layerNames.systemIcons);
    expect(screen.queryByTestId("system-icon-shields")).toBeNull();
    toggleLayer(en.canvas.layerNames.stations);
    expect(screen.queryByTestId("station-1")).toBeNull();
  });

  it("leaves out the editor's marks in the hangar preview", async () => {
    await screen.findByTestId("system-icon-shields");
    act(() => state().select({ ...state().selection, rooms: [0] }));
    expect(svg().querySelector(".cv-room-id")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: en.canvas.preview }));
    expect(svg().querySelector(".cv-room-id")).toBeNull();
    expect(svg().querySelector(".cv-room-selected")).toBeNull();
    expect(svg().querySelector(".cv-door-mark")).toBeNull();
    expect(screen.getByTestId("system-icon-shields")).toBeInTheDocument();
  });
});

describe("the system icon component", () => {
  it("shows the game's icon next to the name, and a blank chip without it", async () => {
    render(<SystemIcon system="shields" />);
    const icon = screen.getAllByTestId("ui-icon-shields").at(-1)!;
    await waitFor(() => expect(icon).toHaveAttribute("data-loaded", "true"));
    expect(within(icon).getByRole("presentation", { hidden: true })).toBeInTheDocument();
    render(<SystemIcon system="artillery" />);
    expect(screen.getAllByTestId("ui-icon-artillery").at(-1)).not.toHaveAttribute("data-loaded");
  });
});
