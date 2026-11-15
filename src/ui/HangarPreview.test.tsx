// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShipSystem } from "../core";
import { useEditor } from "../app/store";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { openLoadoutShip } from "../testing/loadoutFixtures";
import { buildFont } from "../core/testing/fontFile";
import { App } from "./App";

const state = () => useEditor.getState();
const hangar = () => within(screen.getByTestId("hangar-svg"));

const GAME_TEXTS: Record<string, string> = {
  ship_T_name: "The Tee",
  ship_rename_button: "RENAME",
  hangar_frame_crew: "CREW",
  equipment_frame_weapons: "WEAPONS",
  equipment_frame_drones: "DRONES",
  equipment_frame_augments: "AUGMENTATIONS",
  equipment_no_system: "SYSTEM NOT INSTALLED",
  crewbox_customize: "CUSTOMIZE",
};

const systems: ShipSystem[] = [
  { system: "pilot", power: 1, room: 1 },
  { system: "weapons", power: 3, room: 0 },
  { system: "drones", power: 2, room: 2, start: false },
  { system: "shields", power: 2, room: 2 },
];

beforeEach(async () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1280,
    bottom: 720,
    width: 1280,
    height: 720,
    toJSON: () => ({}),
  });
  openLoadoutShip();
  const data = state().game.data!;
  const english = Object.assign(Object.create(null) as Record<string, string>, GAME_TEXTS);
  useEditor.setState({ game: { ...state().game, data: { ...data, texts: { english } } } });
  state().edit((s) => ({
    ...s,
    blueprint: {
      ...s.blueprint,
      systems,
      augments: ["SCRAP_COLLECTOR"],
      crew: [
        { race: "engi", amount: 1 },
        { race: "human", amount: 1 },
      ],
    },
  }));
  render(<App platform={createFakePlatform()} />);
  await waitFor(() => expect(state().view.camera.x).not.toBe(0));
});

afterEach(() => vi.restoreAllMocks());

const open = () => fireEvent.click(screen.getByRole("button", { name: en.canvas.preview }));

describe("the hangar preview", () => {
  it("opens over the editor and closes with its button", () => {
    expect(screen.queryByTestId("hangar-preview")).not.toBeInTheDocument();
    open();
    expect(screen.getByRole("dialog", { name: en.canvas.preview })).toBeInTheDocument();
    const close = screen.getByRole("button", { name: en.canvas.previewOff });
    expect(close).toHaveFocus();
    expect(close).toHaveClass("hg-close");
    expect(close).toHaveAttribute("aria-keyshortcuts", "Escape");
    expect(close.querySelector("svg")).not.toBeNull();
    expect(within(close).getByText(en.canvas.previewOff)).toBeInTheDocument();
    expect(within(close).getByText(en.canvas.previewOffKey)).toBeInTheDocument();
    fireEvent.click(close);
    expect(screen.queryByTestId("hangar-preview")).not.toBeInTheDocument();
    expect(state().view.hangarPreview).toBe(false);
  });

  it("closes with Esc, before the editor's keys see it", () => {
    act(() => state().select({ ...state().selection, rooms: [0] }));
    open();
    // The editor's keys are off while the preview is open.
    act(() => {
      fireEvent.keyDown(window, { code: "Digit2", key: "2" });
    });
    expect(state().workspace).toBe("ship");
    act(() => {
      fireEvent.keyDown(window, { code: "Escape", key: "Escape" });
    });
    expect(screen.queryByTestId("hangar-preview")).not.toBeInTheDocument();
    expect(state().selection.rooms).toEqual([0]);
  });

  it("shows the ship's name and the game's frame titles", () => {
    open();
    expect(within(screen.getByTestId("hangar-name")).getByText("The Tee")).toBeInTheDocument();
    for (const title of ["RENAME", "CREW", "WEAPONS", "DRONES", "AUGMENTATIONS"])
      expect(hangar().getByText(title)).toBeInTheDocument();
    expect(hangar().getByTestId("hangar-ship")).toBeInTheDocument();
  });

  it("has a systems column for each system installed at the start, in the hangar's order", () => {
    open();
    const columns = within(hangar().getByTestId("hangar-systems"))
      .getAllByTestId(/^hangar-system-/)
      .map((g) => [g.dataset.testid, g.querySelectorAll(".hg-power").length]);
    expect(columns).toEqual([
      ["hangar-system-shields", 2],
      ["hangar-system-weapons", 3],
      ["hangar-system-pilot", 1],
    ]);
  });

  it("shows the crew as cards with their race titles, and empty cards after them", () => {
    open();
    const crew = within(hangar().getByTestId("hangar-crew"));
    expect(crew.getByTestId("hangar-crew-1")).toHaveAttribute("data-race", "engi");
    expect(within(crew.getByTestId("hangar-crew-1")).getByText("Engi")).toBeInTheDocument();
    expect(within(crew.getByTestId("hangar-crew-2")).getByText("Human")).toBeInTheDocument();
    expect(crew.getAllByText("CUSTOMIZE")).toHaveLength(2);
    expect(crew.queryByTestId("hangar-crew-3")).not.toBeInTheDocument();
    expect(crew.queryByTestId("hangar-more-crew")).not.toBeInTheDocument();
    act(() =>
      state().edit((s) => ({
        ...s,
        blueprint: { ...s.blueprint, crew: [{ race: "human", amount: 6 }] },
      }))
    );
    expect(hangar().getByTestId("hangar-more-crew")).toHaveTextContent(en.canvas.hangarMoreCrew(2));
  });

  it("puts the weapons in their slots, and says when the drone system is missing", () => {
    open();
    const weapons = hangar().getByTestId("hangar-weapon-slots");
    expect(weapons).toHaveAttribute("data-slots", "2");
    expect(
      within(within(weapons).getByTestId("hangar-weapon-LASER_BURST_1")).getByText("Burst I")
    ).toBeInTheDocument();
    expect(hangar().getByTestId("hangar-drone-not-installed")).toHaveTextContent(
      "SYSTEM NOT INSTALLED"
    );
    expect(hangar().queryByTestId("hangar-drone-slots")).not.toBeInTheDocument();
  });

  it("shows drone slots once the drone system is installed, and the augments", () => {
    open();
    act(() =>
      state().edit((s) => ({
        ...s,
        blueprint: {
          ...s.blueprint,
          systems: s.blueprint.systems.map((x) =>
            x.system === "drones" ? { ...x, start: true } : x
          ),
        },
      }))
    );
    expect(hangar().getByTestId("hangar-drone-slots")).toHaveAttribute("data-slots", "1");
    expect(hangar().queryByTestId("hangar-drone-not-installed")).not.toBeInTheDocument();
    expect(hangar().getByTestId("hangar-system-drones")).toBeInTheDocument();
    const augment = hangar().getByTestId("hangar-augment-SCRAP_COLLECTOR");
    expect(within(augment).getByText("Scrap Recovery Arm")).toBeInTheDocument();
  });

  it("draws the texts in the game's fonts, and in the editor's font where a character is missing", async () => {
    // An HL2 with the capitals and the space, each a 1 × 1 glyph.
    const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ "].map((ch) => ({
      codePoint: ch.codePointAt(0)!,
      x: 0,
      y: 0,
      width: 1,
      height: ch === " " ? 0 : 1,
      top: 1,
      left: 0,
      spacing: 1,
    }));
    const hl2 = buildFont(letters, { width: 1, height: 1, pixels: [255] });
    const data = state().game.data!;
    const read = data.view.readBytes.bind(data.view);
    vi.spyOn(data.view, "readBytes").mockImplementation((path) =>
      path === "fonts/HL2.font" ? Promise.resolve(hl2) : read(path)
    );
    const english = { ...data.texts.english, hangar_frame_crew: "Crew" };
    useEditor.setState({ game: { ...state().game, data: { ...data, texts: { english } } } });
    open();
    const rename = await waitFor(() => {
      const g = hangar().getByTestId("hangar-name").querySelector("[data-text=RENAME]");
      expect(g).not.toBeNull();
      return g!;
    });
    expect(rename.querySelectorAll("svg")).toHaveLength(6);
    expect(rename.querySelector("image")).toHaveAttribute("href");
    // The ship's name is in JustinFont10, which this game lacks; "Crew" has small letters.
    expect(within(screen.getByTestId("hangar-name")).getByText("The Tee").tagName).toBe("text");
    expect(hangar().getByText("Crew").tagName).toBe("text");
    expect(hangar().getByTestId("hangar-drone-not-installed")).toHaveAttribute(
      "data-text",
      "SYSTEM NOT INSTALLED"
    );
  });
});
