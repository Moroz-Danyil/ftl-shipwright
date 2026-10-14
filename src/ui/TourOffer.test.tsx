// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openGameShip } from "../app/ships";
import { resetEditorStore, useEditor } from "../app/store";
import { TOUR_STEPS } from "../app/tour";
import { en } from "../text/en";
import { withMiniGame } from "../testing/editorFixtures";
import type { FakePlatform } from "../testing/fakePlatform";
import { App } from "./App";

const state = () => useEditor.getState();
const offer = () => screen.queryByRole("dialog", { name: en.tour.offer.title });
const stored = () => localStorage.getItem("shipwright.offerTour");

let platform: FakePlatform;

/** A new run of the app: the store as on start, with the mini game loaded. */
async function newRun() {
  platform = await withMiniGame();
  useEditor.setState({ tourOffered: false });
}

async function openShip() {
  await act(async () => {
    expect(await openGameShip(en, "PLAYER_SHIP_MINI")).toBe(true);
  });
}

beforeEach(async () => {
  localStorage.clear();
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
  await newRun();
  render(<App platform={platform} />);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetEditorStore();
});

describe("the offer of a tour", () => {
  it("comes with the first ship opened, with Start the tour focused", async () => {
    await openShip();
    const dialog = offer()!;
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(en.tour.offer.message);
    expect(within(dialog).getByRole("button", { name: en.tour.offer.start })).toHaveFocus();
    expect(within(dialog).getByRole("button", { name: en.tour.offer.skip })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: en.tour.offer.never })).toBeInTheDocument();
  });

  it("starts the tour", async () => {
    await openShip();
    fireEvent.click(screen.getByRole("button", { name: en.tour.offer.start }));
    expect(offer()).not.toBeInTheDocument();
    expect(state().tour?.step).toBe(0);
    expect(screen.getByRole("dialog", { name: en.tour.steps.workspaces.title })).toBeVisible();
  });

  it("after Skip, comes again in the next run but not with the next ship", async () => {
    await openShip();
    fireEvent.click(screen.getByRole("button", { name: en.tour.offer.skip }));
    expect(offer()).not.toBeInTheDocument();
    expect(state().tour).toBeNull();
    expect(stored()).toBeNull();
    act(() => state().closeDocument());
    await openShip();
    expect(offer()).not.toBeInTheDocument();
    await act(newRun);
    await openShip();
    expect(offer()).toBeInTheDocument();
  });

  it("is skipped with Esc too", async () => {
    await openShip();
    fireEvent.keyDown(offer()!, { key: "Escape" });
    expect(offer()).not.toBeInTheDocument();
    expect(stored()).toBeNull();
  });

  it("does not come again after Don't offer this again", async () => {
    await openShip();
    fireEvent.click(screen.getByRole("button", { name: en.tour.offer.never }));
    expect(offer()).not.toBeInTheDocument();
    expect(state().tour).toBeNull();
    expect(JSON.parse(stored()!)).toBe(false);
    await act(newRun);
    await openShip();
    expect(offer()).not.toBeInTheDocument();
  });

  it("does not come again once the tour was taken to its end", async () => {
    await openShip();
    fireEvent.click(screen.getByRole("button", { name: en.tour.offer.start }));
    for (let i = 0; i < TOUR_STEPS.length - 1; i++)
      fireEvent.click(screen.getByRole("button", { name: en.tour.next }));
    fireEvent.click(screen.getByRole("button", { name: en.tour.done }));
    expect(state().tour).toBeNull();
    await act(newRun);
    await openShip();
    expect(offer()).not.toBeInTheDocument();
  });

  it("does not come again once the tour was skipped, also when started from the top bar", async () => {
    useEditor.setState({ tourOffered: true });
    await openShip();
    expect(offer()).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: en.topBar.tutorial }));
    fireEvent.click(screen.getByRole("button", { name: en.tour.skip }));
    await act(newRun);
    await openShip();
    expect(offer()).not.toBeInTheDocument();
  });

  it("keeps the editor's keys off while it is open", async () => {
    await openShip();
    await waitFor(() => expect(offer()).toBeInTheDocument());
    act(() => {
      fireEvent.keyDown(window, { key: "3", code: "Digit3" });
    });
    expect(state().workspace).toBe("ship");
  });
});
