// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { selectionOf } from "../app/selection";
import { initialEditorState, useEditor } from "../app/store";
import { en } from "../text/en";
import { withMiniShipOpen } from "../testing/editorFixtures";
import { createFakePlatform } from "../testing/fakePlatform";
import { pilot, shields } from "../testing/layoutFixtures";
import { openLoadoutShip } from "../testing/loadoutFixtures";
import { App } from "./App";

const state = () => useEditor.getState();
const panel = () => screen.getByRole("complementary", { name: en.info.label });
const inspector = () => screen.getByRole("complementary", { name: en.inspector.label });
const subject = () => panel().querySelector<HTMLElement>(".ed-info-body")?.dataset.subject;
const heading = () => panel().querySelector(".info-head")!;
/** The value of a fact row in the panel, by its label. */
const fact = (label: string) => {
  const row = within(panel())
    .getAllByText(label, { selector: "dt" })
    .map((dt) => dt.parentElement!)[0];
  return row.querySelector("dd")!.textContent;
};

function mockBoxes() {
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
}

/** The loadout test ship with piloting (and its station) in room 1 and shields in room 0. */
async function setUpLoadoutShip() {
  mockBoxes();
  openLoadoutShip();
  const data = state().game.data!;
  useEditor.setState({
    game: {
      ...state().game,
      data: {
        ...data,
        texts: {
          english: Object.assign(Object.create(null), {
            pilot_1: "Needs pilot to function",
            pilot_2: "Auto: 50 percent evasion",
            shields_0: "One Shield Barrier",
            shields_1: "Two Shield Barriers",
          }),
        },
        catalogs: {
          ...data.catalogs,
          systems: data.catalogs.systems.map((s) =>
            s.name === "shields"
              ? { ...s, desc: { kind: "text", text: "Powers your shields." } }
              : s
          ),
        },
      },
    },
  });
  act(() =>
    state().edit((ship) => ({
      ...ship,
      blueprint: { ...ship.blueprint, systems: [pilot, shields] },
    }))
  );
  render(<App platform={createFakePlatform()} />);
  await waitFor(() => expect(state().view.camera.x).not.toBe(0));
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("the Info panel", () => {
  beforeEach(setUpLoadoutShip);

  it("sums up the ship when nothing is selected, with the overview's counts", () => {
    expect(subject()).toBe("ship");
    expect(heading()).toHaveTextContent(en.info.kinds.ship);
    expect(fact(en.info.hull)).toBe("30");
    expect(fact(en.info.reactor)).toBe("8");
    expect(fact(en.info.weaponSlots)).toBe("1 / 2");
    expect(fact(en.info.droneSlots)).toBe("0 / 1");
    expect(fact(en.info.crew)).toBe("2 / 8");
    expect(fact(en.info.rooms)).toBe("3");
    expect(fact(en.info.doors)).toBe("4");
    expect(fact(en.info.systems)).toBe("2");
    expect(within(panel()).getByRole("list", { name: en.info.systems }).children).toHaveLength(2);
    fireEvent.click(within(panel()).getByRole("button", { name: en.info.openOverview }));
    expect(state().dialog).toBe("overview");
  });

  it("describes a selected room: its systems, the crew at its station, its size and doors", () => {
    act(() => state().setWorkspace("rooms"));
    act(() => state().select(selectionOf({ kind: "room", id: 1 })));
    expect(subject()).toBe("room");
    expect(heading()).toHaveTextContent(en.info.kinds.room);
    expect(heading()).toHaveTextContent(en.inspector.room(1));
    const card = panel().querySelector('[data-system="pilot"]')!;
    expect(card).toHaveTextContent("Piloting");
    expect(card).toHaveTextContent(en.systems.states.start);
    expect(card).toHaveTextContent("Needs pilot to function");
    expect(card).toHaveTextContent("Auto: 50 percent evasion");
    // The crew member at the station: the first human, facing right.
    const crew = panel().querySelector(".info-crew")!;
    expect(crew).toHaveAttribute("data-crew", "human");
    expect(crew).toHaveTextContent("Human");
    expect(crew).toHaveTextContent(en.inspector.directions.right);
    expect(fact(en.info.size)).toBe(en.info.cells(2, 2));
    expect(fact(en.info.position)).toBe(en.info.cellsAt(2, 0));
    const doors = within(within(panel()).getByRole("region", { name: en.info.sections.doors }))
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(doors).toEqual([
      en.info.doorTo(0, en.inspector.side(0)),
      en.info.doorTo(1, en.inspector.side(2)),
      en.info.doorTo(3, en.info.airlockTo),
    ]);
  });

  it("describes a system with its levels and power", () => {
    act(() => state().select(selectionOf({ kind: "room", id: 0 })));
    const card = panel().querySelector('[data-system="shields"]')!;
    expect(card).toHaveTextContent("Powers your shields.");
    expect(card).toHaveTextContent(`${en.info.level(2)}One Shield Barrier`);
    expect(card).toHaveTextContent(`${en.info.level(4)}Two Shield Barriers`);
    // The levels reached at the start stand out.
    const reached = [...card.querySelectorAll(".info-levels [data-reached]")].map(
      (row) => row.querySelector("dt")!.textContent
    );
    expect(reached).toEqual([en.info.level(2)]);
    expect(fact(en.info.startingPower)).toBe("2");
    expect(fact(en.info.maxPower)).toBe("8");
  });

  it("makes a system tile or card the subject when it is pressed, until the canvas is clicked", () => {
    act(() => state().setWorkspace("rooms"));
    const tile = inspector().querySelector<HTMLElement>('.sy-tile[data-system="oxygen"]')!;
    fireEvent.pointerDown(tile, { button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(window, { button: 0, clientX: 5, clientY: 5 });
    expect(subject()).toBe("system");
    expect(heading()).toHaveTextContent("Oxygen");
    expect(within(panel()).getByText(en.info.notOnShip)).toBeInTheDocument();
    // A click on the ship goes back to the selection: nothing, so the ship.
    fireEvent.pointerDown(screen.getByRole("main", { name: en.canvas.label }), {
      button: 0,
      clientX: 790,
      clientY: 590,
    });
    expect(subject()).toBe("ship");

    act(() => state().select(selectionOf({ kind: "room", id: 1 })));
    const card = within(inspector()).getByRole("region", { name: "Piloting" });
    fireEvent.click(card);
    expect(subject()).toBe("system");
    expect(fact(en.info.room)).toBe(en.inspector.room(1));
    expect(panel().querySelector(".info-crew")).toHaveAttribute("data-crew", "human");
  });

  it("describes an ordinary door and an airlock", () => {
    act(() => state().select(selectionOf({ kind: "door", index: 0 })));
    expect(subject()).toBe("door");
    expect(heading()).toHaveTextContent(en.info.kinds.door);
    expect(fact(en.info.kind)).toBe(en.info.doorKinds.inner);
    expect(fact(en.info.connects)).toBe(`${en.inspector.side(0)} · ${en.inspector.side(1)}`);
    expect(within(panel()).getByText(en.info.innerAbout)).toBeInTheDocument();

    act(() => state().select(selectionOf({ kind: "door", index: 2 })));
    expect(heading()).toHaveTextContent(en.info.kinds.airlock);
    expect(fact(en.info.kind)).toBe(en.info.doorKinds.airlock);
    expect(fact(en.info.connects)).toBe(`${en.inspector.side(0)} · ${en.inspector.space}`);
    expect(within(panel()).getByText(en.info.airlockAbout)).toBeInTheDocument();
  });

  it("describes a crew station: its system, facing and the crew member there", () => {
    act(() => state().select(selectionOf({ kind: "station", system: 0 })));
    expect(subject()).toBe("station");
    expect(heading()).toHaveTextContent(en.inspector.station("Piloting"));
    expect(fact(en.info.system)).toBe("Piloting");
    expect(fact(en.info.facing)).toBe(en.inspector.directions.right);
    expect(fact(en.info.cell)).toBe("1");
    expect(fact(en.info.crewMember)).toBe("Human");
  });

  it("describes a weapon slot with the weapon's details", () => {
    act(() => state().select(selectionOf({ kind: "weapon", index: 0 })));
    expect(subject()).toBe("weapon");
    expect(heading()).toHaveTextContent(en.info.kinds.weaponSlot);
    expect(heading()).toHaveTextContent(en.loadout.slotLabel(1, "Burst Laser I"));
    expect(fact(en.loadout.details.shots)).toBe("2");
    expect(fact(en.loadout.details.cooldown)).toBe(en.loadout.units.seconds(11));
    expect(fact(en.info.weaponSlots)).toBe(en.info.slotOf(1, 2));
    expect(within(panel()).getByText(en.info.noMount)).toBeInTheDocument();
  });

  it("makes an item clicked in a list the subject, even when the click also adds it", () => {
    const weapons = within(inspector()).getByRole("group", { name: en.loadout.catalog.weapon });
    fireEvent.click(within(weapons).getByText("Artemis"));
    expect(state().selection.weapons).toEqual([1]);
    expect(subject()).toBe("item");
    expect(heading()).toHaveTextContent(en.info.kinds.weapon);
    expect(heading()).toHaveTextContent("Artemis");
    expect(fact(en.loadout.details.missiles)).toBe("1");
    expect(within(panel()).getByText(en.info.inSlots([2]))).toBeInTheDocument();

    const augments = within(inspector()).getByRole("group", { name: en.loadout.catalog.augment });
    fireEvent.click(within(augments).getByText("Scrap Recovery Arm"));
    expect(heading()).toHaveTextContent(en.info.kinds.augment);
    expect(within(panel()).getByText(en.info.augmentCount(1))).toBeInTheDocument();

    // Selecting a slot makes the selection the subject again.
    fireEvent.click(within(inspector()).getByRole("button", { name: /Slot 1: Burst Laser I/ }));
    expect(subject()).toBe("weapon");

    // So does opening another workspace; Rooms leaves the slots out, so the ship.
    fireEvent.click(within(augments).getByText("FTL Booster"));
    expect(subject()).toBe("item");
    act(() => state().setWorkspace("rooms"));
    expect(subject()).toBe("ship");
  });

  it("makes a race clicked in the crew or the Add race list the subject", () => {
    const crew = within(inspector()).getByRole("group", { name: "Human" });
    fireEvent.click(within(crew).getByText("Human"));
    expect(subject()).toBe("race");
    expect(within(panel()).getByText(en.info.inCrew(2))).toBeInTheDocument();

    fireEvent.click(within(inspector()).getByRole("button", { name: en.crew.addRace }));
    fireEvent.click(within(inspector()).getByRole("button", { name: "Engi" }));
    expect(heading()).toHaveTextContent(en.info.kinds.race);
    expect(heading()).toHaveTextContent("Engi");
    expect(panel()).toHaveTextContent("Exceptional engineers.");
    expect(panel()).toHaveTextContent("Repair speed is doubled");
    expect(fact(en.loadout.details.cost)).toBe(en.loadout.units.scrap(45));
    expect(within(panel()).getByText(en.info.inCrew(1))).toBeInTheDocument();
  });

  it("counts what is selected when several things are", () => {
    act(() =>
      state().select(
        selectionOf({ kind: "room", id: 0 }, { kind: "room", id: 1 }, { kind: "door", index: 0 })
      )
    );
    expect(subject()).toBe("several");
    expect(heading()).toHaveTextContent(en.inspector.severalTitle(3));
    expect(fact(en.info.severalCount.rooms)).toBe("2");
    expect(fact(en.info.severalCount.doors)).toBe("1");
  });

  it("keeps the hover panels: hovering a list row shows its details and leaves the subject", () => {
    const weapons = within(inspector()).getByRole("group", { name: en.loadout.catalog.weapon });
    fireEvent.pointerEnter(within(weapons).getByText("Artemis").closest("button")!);
    expect(
      within(screen.getByRole("tooltip")).getByRole("region", { name: "Artemis" })
    ).toHaveTextContent("MISSILES_1");
    expect(subject()).toBe("ship");
  });

  it("folds to a strip and opens again, and remembers the choice", () => {
    fireEvent.click(within(panel()).getByRole("button", { name: en.info.fold }));
    expect(state().infoPanelOpen).toBe(false);
    expect(panel()).toHaveClass("ed-info--folded");
    expect(panel().querySelector(".ed-info-body")).toBeNull();
    expect(localStorage.getItem("shipwright.infoPanel")).toBe("false");
    // The next run of the app starts with it folded.
    expect(initialEditorState().infoPanelOpen).toBe(false);

    fireEvent.click(within(panel()).getByRole("button", { name: en.info.open }));
    expect(state().infoPanelOpen).toBe(true);
    expect(localStorage.getItem("shipwright.infoPanel")).toBeNull();
    expect(subject()).toBe("ship");
  });
});

describe("the Info panel on the hull", () => {
  beforeEach(async () => {
    mockBoxes();
    const platform = await withMiniShipOpen();
    render(<App platform={platform} />);
    await waitFor(() => expect(state().view.camera.x).not.toBe(0));
    act(() => state().setWorkspace("hull"));
  });

  it("describes a weapon mount: the weapon drawn on it and how it is mounted", () => {
    fireEvent.click(within(inspector()).getByRole("button", { name: en.art.selectMount(1) }));
    expect(subject()).toBe("mount");
    expect(heading()).toHaveTextContent(en.info.kinds.mount);
    expect(heading()).toHaveTextContent(en.art.mount(1));
    // The game's later definition of the weapon wins: a beam without a title.
    expect(heading()).toHaveTextContent("GUN");
    expect(fact(en.loadout.details.type)).toBe("BEAM");
    expect(fact(en.loadout.details.damage)).toBe("2");
    expect(fact(en.info.weaponSlot)).toBe(en.info.slotOf(1, 2));
    expect(fact(en.info.rotate)).toBe(en.info.no);
    expect(fact(en.info.mirror)).toBe(en.info.no);
    expect(fact(en.info.slide)).toBe(en.art.slides.up);
    expect(fact(en.info.gib)).toBe(en.art.gibName(1));
    expect(fact(en.info.position)).toBe(en.info.pixels(50, 5));
  });

  it("describes an explosion piece: its picture, position and motion", async () => {
    fireEvent.click(within(inspector()).getByRole("button", { name: en.art.selectGib(1) }));
    expect(subject()).toBe("gib");
    expect(heading()).toHaveTextContent(en.art.gibName(1));
    expect(heading()).toHaveTextContent("mini_gib1.png");
    expect(fact(en.info.position)).toBe(en.info.pixels(0, 0));
    expect(fact(en.info.velocity)).toBe(en.info.range(0, 1));
    expect(fact(en.info.direction)).toBe(en.info.degrees(0, 1));
    expect(fact(en.info.mountsOnGib)).toBe(en.art.mount(1));
    act(() => state().select(selectionOf({ kind: "gib", index: 1 })));
    expect(fact(en.info.position)).toBe(en.info.pixels(80, 0));
    expect(fact(en.info.mountsOnGib)).toBe(en.info.noMounts);
  });
});

describe("the Info panel and the workspaces", () => {
  beforeEach(async () => {
    mockBoxes();
    const platform = await withMiniShipOpen();
    render(<App platform={platform} />);
    await waitFor(() => expect(state().view.camera.x).not.toBe(0));
  });

  it("describes the part of the selection the workspace works with", () => {
    act(() => state().select(selectionOf({ kind: "room", id: 0 }, { kind: "weapon", index: 0 })));
    // Ship shows the room and the slot; Rooms and Hull the room only.
    expect(subject()).toBe("several");
    act(() => state().setWorkspace("rooms"));
    expect(subject()).toBe("room");
    act(() => state().setWorkspace("hull"));
    expect(subject()).toBe("room");
    act(() => state().select(selectionOf({ kind: "room", id: 0 }, { kind: "gib", index: 0 })));
    expect(subject()).toBe("several");
  });
});
