// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { selectionOf } from "../app/selection";
import { useEditor } from "../app/store";
import { TOUR_STEPS, tourKeys } from "../app/tour";
import { en } from "../text/en";
import { withMiniShipOpen } from "../testing/editorFixtures";
import { App } from "./App";

const state = () => useEditor.getState();

/** Where each part of the editor is drawn: a box of its own for each `data-tour` value. */
const BOXES: Record<string, [number, number, number, number]> = {
  workspaces: [300, 10, 60, 30],
  "inspector-ship": [0, 50, 300, 700],
  "inspector-rooms": [0, 50, 300, 700],
  "inspector-hull": [0, 50, 300, 700],
  tools: [320, 60, 200, 30],
  canvas: [0, 0, 800, 600],
  slots: [400, 650, 300, 60],
  view: [850, 700, 80, 30],
  undo: [700, 10, 30, 30],
  overview: [800, 10, 80, 30],
  settings: [900, 10, 80, 30],
};
/** Parts drawn with no size, as if not on screen. */
let hidden: string[] = [];

const rect = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  left: x,
  top: y,
  right: x + width,
  bottom: y + height,
  width,
  height,
  toJSON: () => ({}),
});

/** Presses a key on the window. */
function press(key: string, code = key, extra: Partial<KeyboardEventInit> = {}) {
  act(() => {
    fireEvent.keyDown(window, { key, code, ...extra });
    fireEvent.keyUp(window, { key, code, ...extra });
  });
}

const card = () => screen.getByRole("dialog", { name: /./ });
const highlight = () => screen.queryByTestId("tour-highlight");
const stepShown = () => document.querySelector<HTMLElement>(".tour")?.dataset.step;

function startTour() {
  fireEvent.click(screen.getByRole("button", { name: en.topBar.tutorial }));
}

beforeEach(async () => {
  hidden = [];
  localStorage.clear();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement
  ) {
    const target = this.dataset.tour;
    if (target && hidden.includes(target)) return rect(0, 0, 0, 0);
    const box = target ? BOXES[target] : undefined;
    return box ? rect(...box) : rect(0, 0, 800, 600);
  });
  const platform = await withMiniShipOpen();
  render(<App platform={platform} />);
  await waitFor(() => expect(state().view.camera.x).not.toBe(0));
});

afterEach(() => vi.restoreAllMocks());

describe("the tour", () => {
  it("starts from the Tutorial button with the focus on its card", () => {
    expect(stepShown()).toBeUndefined();
    startTour();
    expect(state().tour?.step).toBe(0);
    expect(card()).toHaveTextContent(en.tour.stepOf(1, TOUR_STEPS.length));
    expect(card()).toHaveTextContent(en.tour.steps.workspaces.title);
    expect(card()).toHaveTextContent(en.tour.steps.workspaces.body(tourKeys(state().keys)));
    expect(within(card()).getByRole("button", { name: en.tour.back })).toBeDisabled();
    expect(within(card()).getByRole("button", { name: en.tour.next })).toHaveFocus();
    expect(document.querySelector(".ed-window")).toHaveAttribute("inert");
  });

  it("highlights each step's part and opens the workspace that shows it", () => {
    act(() => state().setWorkspace("hull"));
    startTour();
    const workspaces = { shipInspector: "ship", roomsInspector: "rooms", hullInspector: "hull" };
    TOUR_STEPS.forEach((step, i) => {
      expect(stepShown()).toBe(step.id);
      expect(card()).toHaveTextContent(en.tour.stepOf(i + 1, TOUR_STEPS.length));
      expect(card()).toHaveTextContent(en.tour.steps[step.id].title);
      const [x, y, w, h] = BOXES[step.target];
      // The outline goes 4 px around the part, inside the window.
      const left = Math.max(1, x - 4);
      const top = Math.max(1, y - 4);
      expect(highlight()).toHaveStyle({
        left: `${left}px`,
        top: `${top}px`,
        width: `${Math.min(window.innerWidth - 1, x + w + 4) - left}px`,
        height: `${Math.min(window.innerHeight - 1, y + h + 4) - top}px`,
      });
      expect(document.querySelectorAll(`[data-tour="${step.target}"]`).length).toBeGreaterThan(0);
      if (step.id in workspaces)
        expect(state().workspace).toBe(workspaces[step.id as keyof typeof workspaces]);
      if (step.id === "slots") expect(state().workspace).toBe("ship");
      fireEvent.click(within(card()).getByRole("button", { name: i === 10 ? /Done/ : /Next/ }));
    });
    expect(state().tour).toBeNull();
    expect(stepShown()).toBeUndefined();
  });

  it("highlights every element of a part together", () => {
    startTour();
    act(() => state().setTourStep(TOUR_STEPS.findIndex((s) => s.id === "undo")));
    expect(document.querySelectorAll('[data-tour="undo"]')).toHaveLength(2);
    expect(highlight()).toHaveStyle({ left: "696px", top: "6px", width: "38px" });
  });

  it("goes on with → and Enter, back with ←, and ends with Esc", () => {
    startTour();
    press("ArrowRight");
    expect(state().tour?.step).toBe(1);
    act(() => (document.activeElement as HTMLElement | null)?.blur());
    press("Enter");
    expect(state().tour?.step).toBe(2);
    press("ArrowLeft");
    expect(state().tour?.step).toBe(1);
    press("ArrowLeft");
    press("ArrowLeft");
    expect(state().tour?.step).toBe(0);
    press("Escape");
    expect(state().tour).toBeNull();
  });

  it("goes back with Back and ends with Skip tour", () => {
    startTour();
    fireEvent.click(within(card()).getByRole("button", { name: en.tour.next }));
    fireEvent.click(within(card()).getByRole("button", { name: en.tour.next }));
    fireEvent.click(within(card()).getByRole("button", { name: en.tour.back }));
    expect(state().tour?.step).toBe(1);
    // Back turns off on the first step; the focus moves on to Next.
    const back = within(card()).getByRole("button", { name: en.tour.back });
    act(() => back.focus());
    fireEvent.click(back);
    expect(back).toBeDisabled();
    expect(within(card()).getByRole("button", { name: en.tour.next })).toHaveFocus();
    fireEvent.click(within(card()).getByRole("button", { name: en.tour.skip }));
    expect(state().tour).toBeNull();
    expect(screen.queryByRole("button", { name: en.tour.skip })).not.toBeInTheDocument();
  });

  it("ends with Done on the last step, and → there ends it too", () => {
    startTour();
    act(() => state().setTourStep(TOUR_STEPS.length - 1));
    expect(within(card()).queryByRole("button", { name: en.tour.next })).not.toBeInTheDocument();
    expect(within(card()).getByRole("button", { name: en.tour.done })).toHaveFocus();
    press("ArrowRight");
    expect(state().tour).toBeNull();
  });

  it("puts the workspace and the selection back, and changes nothing in the ship", () => {
    act(() => state().setWorkspace("rooms"));
    act(() => state().select(selectionOf({ kind: "room", id: 1 })));
    const before = state().doc!.history;
    startTour();
    expect(state().selection.rooms).toEqual([]);
    for (let i = 0; i < TOUR_STEPS.length - 1; i++) press("ArrowRight");
    expect(state().workspace).toBe("ship");
    press("Escape");
    expect(state().workspace).toBe("rooms");
    expect(state().selection.rooms).toEqual([1]);
    expect(state().doc!.history).toBe(before);
  });

  it("leaves the editing keys alone while it runs", () => {
    act(() => state().setWorkspace("rooms"));
    act(() => state().select(selectionOf({ kind: "room", id: 1 })));
    const before = state().doc!.history;
    startTour();
    act(() => state().setTourStep(TOUR_STEPS.findIndex((s) => s.id === "tools")));
    const workspace = state().workspace;
    const tools = state().tools;
    press("1", "Digit1");
    press("3", "Digit3");
    press("w", "KeyW");
    press("d", "KeyD");
    press("Delete", "Delete");
    press("z", "KeyZ", { ctrlKey: true });
    press(" ", "Space");
    expect(state().workspace).toBe(workspace);
    expect(state().tools).toEqual(tools);
    expect(state().view.panHeld).toBe(false);
    expect(state().dialog).toBeNull();
    expect(state().doc!.history).toBe(before);
    expect(state().tour).not.toBeNull();
  });

  it("shows the card in the middle of the window when a step's part is not on screen", () => {
    hidden = ["overview"];
    startTour();
    act(() => state().setTourStep(TOUR_STEPS.findIndex((s) => s.id === "overview")));
    expect(stepShown()).toBe("overview");
    expect(highlight()).toBeNull();
    expect(document.querySelector(".tour")).toHaveClass("tour--dim");
    // The card measures 800 × 600 here.
    expect(card()).toHaveStyle({
      left: `${(window.innerWidth - 800) / 2}px`,
      top: `${(window.innerHeight - 600) / 2}px`,
    });
  });

  it("names the keys chosen in Settings", () => {
    act(() => state().setKey("undo", "Ctrl+U"));
    startTour();
    act(() => state().setTourStep(TOUR_STEPS.findIndex((s) => s.id === "undo")));
    expect(card()).toHaveTextContent("Undo: Ctrl+U.");
  });
});
