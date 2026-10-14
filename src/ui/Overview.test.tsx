// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addDoor, updateBlueprint } from "../core";
import { selectionOf } from "../app/selection";
import { useEditor } from "../app/store";
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

/** A copy of the complete ship without crew and with a door touching no room. */
function withChecks() {
  let ship = updateBlueprint(completeShip(), { crew: [] });
  ship = addDoor(ship, { x: 20, y: 9, vertical: true });
  return ship;
}

function openOverview(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
  return screen.getByRole("dialog", { name: t.title });
}

afterEach(() => vi.restoreAllMocks());

describe("the Overview button", () => {
  it("has no badge when everything is fine", async () => {
    await setUp();
    const button = screen.getByRole("button", { name: t.buttonLabel(0, 0) });
    expect(button).toHaveTextContent(/^Overview$/);
    expect(button.querySelector(".ed-badge")).toBeNull();
  });

  it("counts the items to check in amber", async () => {
    await setUp(withChecks());
    const button = screen.getByRole("button", { name: "Overview: 2 to check" });
    expect(button.querySelector(".ed-badge--check")).toHaveTextContent("2");
  });

  it("counts the problems in red, ahead of the items to check", async () => {
    await setUp(updateBlueprint(withChecks(), { health: 0 }), { ...fullArt(), hull: undefined });
    const button = screen.getByRole("button", { name: "Overview: 2 problems" });
    expect(button.querySelector(".ed-badge--problem")).toHaveTextContent("2");
    expect(button.querySelector(".ed-badge--check")).toBeNull();
  });
});

describe("the Ship overview dialog", () => {
  it("says everything looks complete and lists every item with its value", async () => {
    await setUp();
    const dialog = openOverview(t.buttonLabel(0, 0));
    expect(within(dialog).getByText(t.intro)).toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent(t.allGood);
    const sections = within(dialog).getAllByRole("region");
    expect(sections.map((s) => within(s).getByRole("heading").textContent)).toEqual([
      "Ship",
      "Rooms",
      "Hull",
    ]);
    const rooms = within(sections[1]).getAllByRole("listitem");
    expect(rooms).toHaveLength(13);
    expect(rooms[0]).toHaveTextContent(`${t.items.rooms.title}Rooms: 4`);
    expect(within(rooms[0]).getByRole("img", { name: t.status.ok })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /^Go there/ })).toBeNull();
  });

  it("shows the counts as chips and a card for each item that needs a look", async () => {
    await setUp(withChecks(), { ...fullArt(), hull: undefined });
    const dialog = openOverview("Overview: 1 problem");
    const summary = within(dialog).getByRole("status");
    expect(summary).toHaveTextContent(t.problems(1) + t.toCheck(2));
    expect(within(dialog).queryByText(t.allGood)).toBeNull();

    const hull = within(dialog).getByRole("button", { name: t.goThereLabel(t.items.hull.title) })
      .parentElement!.parentElement!;
    expect(hull).toHaveClass("ov-card--problem");
    expect(within(hull).getByRole("img", { name: t.status.problem })).toBeInTheDocument();
    expect(hull).toHaveTextContent(t.items.hull.explain);

    const doors = within(dialog).getByRole("button", { name: t.goThereLabel(t.items.doors.title) })
      .parentElement!.parentElement!;
    expect(doors).toHaveClass("ov-card--check");
    expect(within(doors).getByRole("img", { name: t.status.check })).toBeInTheDocument();
    expect(doors).toHaveTextContent(t.items.doors.explain);
    expect(doors).toHaveTextContent(en.checks.messages["door-no-room"]({ door: 5 }));
    expect(doors).not.toHaveTextContent("Doors: 3");
  });

  it("hides the items that are ok with the filter, and remembers it", async () => {
    await setUp(withChecks());
    let dialog = openOverview("Overview: 2 to check");
    const all = within(dialog).getAllByRole("listitem").length;
    const filter = within(dialog).getByRole("checkbox", { name: t.needsOnly });
    expect(filter).not.toBeChecked();
    fireEvent.click(filter);
    expect(state().overviewNeedsOnly).toBe(true);
    const cards = dialog.querySelectorAll(".ov-items > li");
    expect([...cards].map((c) => c.className)).toEqual([
      "ov-card ov-card--check",
      "ov-card ov-card--check",
    ]);
    expect(
      within(dialog)
        .getAllByRole("region")
        .map((s) => within(s).getByRole("heading").textContent)
    ).toEqual(["Ship", "Rooms"]);
    expect(within(dialog).getAllByRole("listitem").length).toBeLessThan(all);

    fireEvent.click(within(dialog).getByRole("button", { name: en.common.close }));
    dialog = openOverview("Overview: 2 to check");
    expect(within(dialog).getByRole("checkbox", { name: t.needsOnly })).toBeChecked();
  });

  it("goes to the workspace and selection of an item and closes", async () => {
    await setUp(withChecks());
    act(() => state().setWorkspace("hull"));
    const dialog = openOverview("Overview: 2 to check");
    fireEvent.click(
      within(dialog).getByRole("button", { name: t.goThereLabel(t.items.doors.title) })
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state().workspace).toBe("rooms");
    expect(state().selection).toEqual(selectionOf({ kind: "door", index: 5 }));

    fireEvent.click(screen.getByRole("button", { name: "Overview: 2 to check" }));
    const crew = screen.getByRole("dialog", { name: t.title }).querySelector(".ov-card")!;
    fireEvent.click(crew);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state().workspace).toBe("ship");
  });

  it("starts on the filter and closes with Esc", async () => {
    await setUp(withChecks());
    const dialog = openOverview("Overview: 2 to check");
    expect(within(dialog).getByRole("checkbox", { name: t.needsOnly })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state().workspace).toBe("ship");
  });
});
