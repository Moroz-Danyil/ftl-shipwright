// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShipSystem } from "../core";
import { useEditor } from "../app/store";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { openLoadoutShip } from "../testing/loadoutFixtures";
import { App } from "./App";

const state = () => useEditor.getState();
const hangar = () => within(screen.getByTestId("hangar-svg"));

const GAME_TEXTS: Record<string, string> = {
  ship_T_name: "The Tee",
  ship_rename_button: "RENAME",
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

  it("shows the ship's name with the game's label", () => {
    open();
    expect(within(screen.getByTestId("hangar-name")).getByText("The Tee")).toBeInTheDocument();
    expect(hangar().getByText("RENAME")).toBeInTheDocument();
    expect(hangar().getByTestId("hangar-ship")).toBeInTheDocument();
  });
});
