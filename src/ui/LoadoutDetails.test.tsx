// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addMount } from "../core";
import { useEditor } from "../app/store";
import { en } from "../text/en";
import { createFakePlatform, type FakePlatform } from "../testing/fakePlatform";
import { openLoadoutShip } from "../testing/loadoutFixtures";
import { App } from "./App";

const state = () => useEditor.getState();
const bp = () => state().doc!.history.present.ship.blueprint;
const steps = () => state().doc!.history.past.length;
const inspector = () => screen.getByRole("complementary", { name: en.inspector.label });
const bar = () => screen.getByRole("group", { name: en.loadout.bar });

function press(code: string) {
  act(() => {
    fireEvent.keyDown(window, { code });
    fireEvent.keyUp(window, { code });
  });
}

function commit(field: HTMLElement, value: string) {
  fireEvent.change(field, { target: { value } });
  fireEvent.keyDown(field, { key: "Enter" });
}

let platform: FakePlatform;

async function setUp(origin?: { kind: "game" }) {
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
  openLoadoutShip(origin);
  platform = createFakePlatform();
  render(<App platform={platform} />);
  await waitFor(() => expect(state().view.camera.x).not.toBe(0));
}

afterEach(() => vi.restoreAllMocks());

describe("Loadout workspace", () => {
  beforeEach(async () => {
    await setUp();
    press("Digit4");
  });

  it("shows the slots and adds items from the cards", () => {
    expect(within(bar()).getByText(en.loadout.weaponsCount(1, 2))).toBeInTheDocument();
    expect(
      within(bar()).getByRole("button", { name: en.loadout.slotLabel(1, "Burst I") })
    ).toBeInTheDocument();
    expect(within(bar()).getByText(en.loadout.emptySlot.weapon)).toBeInTheDocument();

    fireEvent.click(within(inspector()).getByRole("button", { name: /Artemis/ }));
    expect(bp().weaponList?.items).toEqual(["LASER_BURST_1", "MISSILES_1"]);
    expect(
      within(bar()).getByRole("button", { name: en.loadout.slotLabel(2, "Artemis") })
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(inspector()).getByRole("button", { name: /Artemis/ }));
    expect(state().notice?.text).toBe(en.loadout.full.weapon);

    fireEvent.click(within(inspector()).getByRole("tab", { name: en.loadout.tabs.drone }));
    expect(within(inspector()).getByRole("button", { name: /Combat Drone I/ })).toBeInTheDocument();
    expect(within(inspector()).queryByRole("button", { name: /A store item/ })).toBeNull();
    fireEvent.click(within(inspector()).getByRole("button", { name: /Combat Drone I/ }));
    expect(bp().droneList?.items).toEqual(["COMBAT_1"]);
    expect(steps()).toBe(2);
  });

  it("shows an item's details beside the list on hover and hides them on leave", () => {
    const card = within(inspector()).getByRole("button", { name: /Burst Laser I/ });
    fireEvent.pointerEnter(card);
    const popover = screen.getByRole("tooltip");
    expect(inspector()).not.toContainElement(popover);
    const details = within(popover).getByRole("region", { name: "Burst Laser I" });
    expect(details).toHaveTextContent(en.loadout.details.fireChance);
    expect(details).toHaveTextContent(en.loadout.units.percent(1));
    expect(details).toHaveTextContent(en.loadout.units.seconds(11));
    expect(within(inspector()).getByText(en.loadout.hint)).toBeInTheDocument();
    fireEvent.pointerLeave(card.parentElement!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("selects, reorders and deletes slots", () => {
    fireEvent.click(within(inspector()).getByRole("button", { name: /Artemis/ }));
    fireEvent.click(
      within(bar()).getByRole("button", { name: en.loadout.slotLabel(2, "Artemis") })
    );
    expect(within(inspector()).getByText(en.loadout.drawnOnMount(2))).toBeInTheDocument();
    fireEvent.click(within(inspector()).getByRole("button", { name: en.loadout.earlier }));
    expect(bp().weaponList?.items).toEqual(["MISSILES_1", "LASER_BURST_1"]);
    press("Delete");
    expect(bp().weaponList?.items).toEqual(["LASER_BURST_1"]);
    expect(bp().weaponList?.count).toBe(1);
  });

  it("links the hovered slot and its mount", () => {
    act(() =>
      state().edit((s) => addMount(s, { x: 40, y: 40, rotate: false, mirror: false, gib: 0 }))
    );
    fireEvent.pointerEnter(
      within(bar()).getByRole("button", { name: en.loadout.slotLabel(1, "Burst I") })
    );
    expect(screen.getByTestId("mount-1")).toHaveAttribute("data-hovered", "true");
    fireEvent.pointerLeave(
      within(bar()).getByRole("button", { name: en.loadout.slotLabel(1, "Burst I") })
    );
    expect(screen.getByTestId("mount-1")).not.toHaveAttribute("data-hovered");
    fireEvent.pointerEnter(screen.getByTestId("mount-1"));
    expect(state().hoverWeapon).toBe(0);
  });

  it("changes slot counts, missiles and augments", () => {
    const slots = within(inspector()).getByRole("group", { name: en.loadout.weaponSlots });
    fireEvent.click(
      within(slots).getByRole("button", { name: en.systems.higher(en.loadout.weaponSlots) })
    );
    expect(bp().weaponSlots).toBe(3);
    commit(within(inspector()).getByLabelText(en.loadout.missiles), "6");
    expect(bp().weaponList?.missiles).toBe(6);
    fireEvent.click(within(inspector()).getByRole("tab", { name: en.loadout.tabs.augment }));
    fireEvent.click(within(inspector()).getByRole("button", { name: /Scrap Recovery Arm/ }));
    const augments = within(inspector()).getByRole("group", { name: en.loadout.augments(1) });
    fireEvent.click(
      within(augments).getByRole("button", { name: en.loadout.removeNamed("Scrap Recovery Arm") })
    );
    expect(bp().augments).toEqual([]);
    expect(steps()).toBe(4);
  });
});

describe("Details workspace", () => {
  it("edits the hangar texts, hull and crew", async () => {
    await setUp();
    press("Digit5");
    commit(within(inspector()).getByLabelText(en.details.name), "The T");
    expect(bp().texts.name).toEqual({ kind: "text", text: "The T" });
    expect(screen.getAllByText("The T").length).toBeGreaterThan(0);
    const hull = within(inspector()).getByRole("group", { name: en.details.hull });
    fireEvent.click(within(hull).getByRole("button", { name: en.systems.higher(en.details.hull) }));
    expect(bp().health).toBe(31);
    fireEvent.change(within(inspector()).getByLabelText(en.details.addRace), {
      target: { value: "engi" },
    });
    expect(bp().crew).toEqual([
      { amount: 2, race: "human" },
      { amount: 1, race: "engi" },
    ]);
    const humans = within(inspector()).getByRole("group", { name: "Human" });
    const lower = within(humans).getByRole("button", { name: en.systems.lower("Human") });
    fireEvent.click(lower);
    fireEvent.click(lower);
    expect(bp().crew).toEqual([{ amount: 1, race: "engi" }]);
    expect(steps()).toBe(5);
  });

  it("asks before giving a game ship a new save name", async () => {
    await setUp({ kind: "game" });
    press("Digit5");
    platform.answers.confirm.push(true);
    commit(within(inspector()).getByLabelText(en.details.blueprintName), "MY_T");
    await waitFor(() => expect(bp().name).toBe("MY_T"));
    expect(platform.asked).toEqual([{ kind: "confirm", message: en.details.confirmRename }]);
  });
});
