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

describe("Ship workspace: equipment", () => {
  beforeEach(async () => {
    await setUp();
    expect(state().workspace).toBe("ship");
  });

  const section = (name: string) => within(inspector()).getByRole("region", { name });
  const cards = (kind: "weapon" | "drone" | "augment") =>
    within(inspector()).getByRole("group", { name: en.loadout.catalog[kind] });
  const listOf = (kind: "weapon" | "drone" | "augment") =>
    within(inspector()).getByRole("list", { name: en.loadout.equipped[kind] });

  it("shows the slots and adds weapons and drones from their cards", () => {
    expect(within(bar()).getByText(en.loadout.weaponsCount(1, 2))).toBeInTheDocument();
    expect(
      within(bar()).getByRole("button", { name: en.loadout.slotLabel(1, "Burst I") })
    ).toBeInTheDocument();
    expect(within(bar()).getByText(en.loadout.emptySlot.weapon)).toBeInTheDocument();
    const weapons = section(en.sections.weapons);
    expect(within(weapons).getByText(en.sections.count(1, 2))).toBeInTheDocument();

    fireEvent.click(within(cards("weapon")).getByRole("button", { name: /Artemis/ }));
    expect(bp().weaponList?.items).toEqual(["LASER_BURST_1", "MISSILES_1"]);
    expect(
      within(bar()).getByRole("button", { name: en.loadout.slotLabel(2, "Artemis") })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(listOf("weapon")).getByRole("button", { name: en.loadout.slotLabel(2, "Artemis") })
    ).toHaveAttribute("aria-pressed", "true");
    expect(within(weapons).getByText(en.sections.count(2, 2))).toBeInTheDocument();
    fireEvent.click(within(cards("weapon")).getByRole("button", { name: /Artemis/ }));
    expect(state().notice?.text).toBe(en.loadout.full.weapon);

    const drones = section(en.sections.drones);
    expect(within(drones).getByText(en.loadout.noItems.drone)).toBeInTheDocument();
    expect(within(cards("drone")).queryByRole("button", { name: /A store item/ })).toBeNull();
    fireEvent.click(within(cards("drone")).getByRole("button", { name: /Combat Drone I/ }));
    expect(bp().droneList?.items).toEqual(["COMBAT_1"]);
    expect(within(listOf("drone")).getAllByRole("listitem")).toHaveLength(1);
    expect(steps()).toBe(2);
  });

  it("shows an item's details beside the list on hover and hides them on leave", () => {
    const card = within(cards("weapon")).getByRole("button", {
      name: /Burst Laser I/,
    });
    fireEvent.pointerEnter(card);
    const popover = screen.getByRole("tooltip");
    expect(inspector()).not.toContainElement(popover);
    const details = within(popover).getByRole("region", { name: "Burst Laser I" });
    expect(details).toHaveTextContent(en.loadout.details.fireChance);
    expect(details).toHaveTextContent(en.loadout.units.percent(1));
    expect(details).toHaveTextContent(en.loadout.units.seconds(11));
    expect(within(inspector()).getByText(en.loadout.hints.weapon)).toBeInTheDocument();
    fireEvent.pointerLeave(card.parentElement!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("selects, reorders and removes weapons from their list", () => {
    fireEvent.click(within(cards("weapon")).getByRole("button", { name: /Artemis/ }));
    const list = listOf("weapon");
    fireEvent.click(
      within(list).getByRole("button", { name: en.loadout.slotLabel(1, "Burst Laser I") })
    );
    expect(state().selection.weapons).toEqual([0]);
    expect(
      within(bar()).getByRole("button", { name: en.loadout.slotLabel(1, "Burst I") })
    ).toHaveAttribute("aria-pressed", "true");

    expect(
      within(list).getByRole("button", { name: en.loadout.earlierNamed("Burst Laser I") })
    ).toBeDisabled();
    fireEvent.click(within(list).getByRole("button", { name: en.loadout.earlierNamed("Artemis") }));
    expect(bp().weaponList?.items).toEqual(["MISSILES_1", "LASER_BURST_1"]);
    expect(state().selection.weapons).toEqual([0]);
    fireEvent.click(
      within(listOf("weapon")).getByRole("button", { name: en.loadout.laterNamed("Artemis") })
    );
    expect(bp().weaponList?.items).toEqual(["LASER_BURST_1", "MISSILES_1"]);

    fireEvent.click(
      within(listOf("weapon")).getByRole("button", {
        name: en.loadout.removeNamed("Burst Laser I"),
      })
    );
    expect(bp().weaponList?.items).toEqual(["MISSILES_1"]);
    expect(steps()).toBe(4);

    fireEvent.click(
      within(listOf("weapon")).getByRole("button", { name: en.loadout.slotLabel(1, "Artemis") })
    );
    press("Delete");
    expect(bp().weaponList?.items).toEqual([]);
    expect(
      within(section(en.sections.weapons)).getByText(en.loadout.noItems.weapon)
    ).toBeInTheDocument();
  });

  it("adds, reorders and removes drones from their list", () => {
    const drones = section(en.sections.drones);
    const slots = within(inspector()).getByRole("group", { name: en.loadout.droneSlots });
    fireEvent.click(
      within(slots).getByRole("button", { name: en.systems.higher(en.loadout.droneSlots) })
    );
    fireEvent.click(within(cards("drone")).getByRole("button", { name: /Combat Drone I/ }));
    fireEvent.click(within(cards("drone")).getByRole("button", { name: /System Repair Drone/ }));
    expect(bp().droneList?.items).toEqual(["COMBAT_1", "REPAIR"]);
    expect(within(drones).getByText(en.sections.count(2, 2))).toBeInTheDocument();
    fireEvent.click(
      within(listOf("drone")).getByRole("button", {
        name: en.loadout.earlierNamed("System Repair Drone"),
      })
    );
    expect(bp().droneList?.items).toEqual(["REPAIR", "COMBAT_1"]);
    expect(state().selection.drones).toEqual([0]);
    fireEvent.click(
      within(listOf("drone")).getByRole("button", {
        name: en.loadout.removeNamed("Combat Drone I"),
      })
    );
    expect(bp().droneList?.items).toEqual(["REPAIR"]);
  });

  it("links a hovered weapon, in the bar or in the list, to its mount", () => {
    act(() =>
      state().edit((s) => addMount(s, { x: 40, y: 40, rotate: false, mirror: false, gib: 0 }))
    );
    const slot = within(bar()).getByRole("button", { name: en.loadout.slotLabel(1, "Burst I") });
    fireEvent.pointerEnter(slot);
    expect(screen.getByTestId("mount-1")).toHaveAttribute("data-hovered", "true");
    fireEvent.pointerLeave(slot);
    expect(screen.getByTestId("mount-1")).not.toHaveAttribute("data-hovered");
    const row = within(listOf("weapon")).getByRole("button", {
      name: en.loadout.slotLabel(1, "Burst Laser I"),
    });
    fireEvent.pointerEnter(row);
    expect(screen.getByTestId("mount-1")).toHaveAttribute("data-hovered", "true");
    expect(
      within(screen.getByRole("tooltip")).getByRole("region", { name: "Burst Laser I" })
    ).toBeInTheDocument();
    fireEvent.pointerLeave(row);
    expect(screen.getByTestId("mount-1")).not.toHaveAttribute("data-hovered");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    fireEvent.pointerEnter(screen.getByTestId("mount-1"));
    expect(state().hoverWeapon).toBe(0);
  });

  it("changes slot counts and missiles", () => {
    const slots = within(inspector()).getByRole("group", { name: en.loadout.weaponSlots });
    fireEvent.click(
      within(slots).getByRole("button", { name: en.systems.higher(en.loadout.weaponSlots) })
    );
    expect(bp().weaponSlots).toBe(3);
    commit(within(inspector()).getByLabelText(en.loadout.missiles), "6");
    expect(bp().weaponList?.missiles).toBe(6);
    expect(steps()).toBe(2);
  });

  it("adds an augment, shows its details on hover and removes it", () => {
    const augments = section(en.sections.augments);
    expect(within(augments).getByText(en.loadout.noAugments)).toBeInTheDocument();
    expect(within(augments).getByText(en.loadout.hints.augment)).toBeInTheDocument();
    fireEvent.click(within(cards("augment")).getByRole("button", { name: /Scrap Recovery Arm/ }));
    expect(bp().augments).toEqual(["SCRAP_COLLECTOR"]);
    expect(within(augments).getByText(en.sections.count(1, 3))).toBeInTheDocument();
    const list = listOf("augment");
    fireEvent.pointerEnter(within(list).getByText("Scrap Recovery Arm").closest(".eq-augment")!);
    expect(
      within(screen.getByRole("tooltip")).getByRole("region", { name: "Scrap Recovery Arm" })
    ).toHaveTextContent(en.loadout.units.scrap(50));
    fireEvent.click(
      within(list).getByRole("button", { name: en.loadout.removeNamed("Scrap Recovery Arm") })
    );
    expect(bp().augments).toEqual([]);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(steps()).toBe(2);
  });
});

describe("Ship workspace: info, stats and crew", () => {
  beforeEach(async () => {
    await setUp();
    press("Digit3");
    press("Digit1");
  });

  it("shows everything about the ship in order", () => {
    const sections = within(inspector())
      .getAllByRole("region")
      .filter((r) => r.classList.contains("sec"))
      .map((r) => r.getAttribute("aria-label"));
    expect(sections).toEqual([
      en.sections.info,
      en.sections.stats,
      en.sections.crew,
      en.sections.weapons,
      en.sections.drones,
      en.sections.augments,
    ]);
  });

  it("puts pictograms before the section titles, the save name and the stats", async () => {
    const heads = [...inspector().querySelectorAll(".sec-head")];
    expect(heads.map((h) => h.querySelector(".pict")?.getAttribute("data-pictogram"))).toEqual([
      "info",
      "stats",
      "crew",
      "weapons",
      "drones",
      "augments",
    ]);
    expect(
      heads.every((h) => h.querySelector(".pict")?.getAttribute("aria-hidden") === "true")
    ).toBe(true);
    const save = within(inspector()).getByRole("group", { name: en.hangar.saveName });
    expect(save.querySelector('[data-pictogram="save"]')).not.toBeNull();
    const stats = within(inspector()).getByRole("region", { name: en.sections.stats });
    expect(
      [...stats.querySelectorAll(".sec-body .pict")].map((p) => p.getAttribute("data-pictogram"))
    ).toEqual(["hull", "reactor", "weaponSlots", "droneSlots", "missiles", "droneParts"]);
    expect(within(stats).getByRole("group", { name: en.loadout.hull })).toBeInTheDocument();
    expect(within(stats).getByLabelText(en.loadout.missiles)).toHaveValue(4);
    // The game's own icons: the weapons system icon and the missile icon.
    const weapons = heads[3].querySelector(".pict")!;
    expect(weapons).toHaveClass("pict--game");
    await waitFor(() => expect(weapons.querySelector("img")).not.toBeNull());
    const missiles = stats.querySelector('[data-pictogram="missiles"]')!;
    await waitFor(() => expect(missiles.querySelector("img")).not.toBeNull());
    expect(stats.querySelector('[data-pictogram="hull"] svg')).not.toBeNull();
  });

  it("edits the hull and the crew", () => {
    const hull = within(inspector()).getByRole("group", { name: en.loadout.hull });
    fireEvent.click(within(hull).getByRole("button", { name: en.systems.higher(en.loadout.hull) }));
    expect(bp().health).toBe(31);
    const add = within(inspector()).getByRole("button", { name: en.crew.addRace });
    fireEvent.click(add);
    expect(add).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(within(inspector()).getByRole("button", { name: /Engi/ }));
    expect(bp().crew).toEqual([
      { amount: 2, race: "human" },
      { amount: 1, race: "engi" },
    ]);
    // Every race of the game is in the crew now, so there is nothing left to add.
    expect(within(inspector()).queryByRole("button", { name: en.crew.addRace })).toBeNull();
    commit(within(inspector()).getByLabelText(en.crew.amountOf("Engi")), "3");
    expect(bp().crew).toEqual([
      { amount: 2, race: "human" },
      { amount: 3, race: "engi" },
    ]);
    fireEvent.click(within(inspector()).getByRole("button", { name: en.crew.removeRace("Human") }));
    expect(bp().crew).toEqual([{ amount: 3, race: "engi" }]);
    expect(steps()).toBe(4);
  });

  it("shows a race's description and abilities beside the list on hover", () => {
    fireEvent.click(within(inspector()).getByRole("button", { name: en.crew.addRace }));
    const list = within(inspector()).getByRole("list", { name: en.crew.races });
    const card = within(list).getByRole("button", { name: /Engi/ });
    fireEvent.pointerEnter(card);
    const details = within(screen.getByRole("tooltip")).getByRole("region", { name: "Engi" });
    expect(details).toHaveTextContent("Repair speed is doubled");
    expect(details).toHaveTextContent(en.crew.abilities);
    expect(details).toHaveTextContent(en.loadout.units.scrap(45));
    fireEvent.pointerLeave(list);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    fireEvent.keyDown(card, { key: "Escape" });
    expect(within(inspector()).queryByRole("list", { name: en.crew.races })).toBeNull();
  });

  it("shows the details of a race already in the crew when its name is hovered", () => {
    fireEvent.click(within(inspector()).getByRole("button", { name: en.crew.addRace }));
    fireEvent.click(within(inspector()).getByRole("button", { name: /Engi/ }));
    const row = within(inspector()).getByRole("group", { name: "Engi" });
    const name = within(row).getByText("Engi");
    fireEvent.pointerEnter(name.parentElement!);
    expect(
      within(screen.getByRole("tooltip")).getByRole("region", { name: "Engi" })
    ).toHaveTextContent("Repair speed is doubled");
    fireEvent.pointerLeave(name.parentElement!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("explains the hull on hover, with the game's hull bar", () => {
    const hull = within(inspector()).getByRole("group", { name: en.loadout.hull });
    fireEvent.pointerEnter(hull.parentElement!);
    const help = screen.getByRole("tooltip");
    expect(within(help).getByRole("region", { name: en.help.hull.title })).toHaveTextContent(
      en.help.hull.body
    );
    expect(help.querySelectorAll(".hv-hull span")).toHaveLength(bp().health ?? 30);
    fireEvent.pointerLeave(hull.parentElement!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("is opened by the crew check", () => {
    act(() => state().edit((s) => ({ ...s, blueprint: { ...s.blueprint, crew: [] } })));
    press("Digit3");
    fireEvent.click(screen.getByRole("button", { name: /to check$/ }));
    fireEvent.click(screen.getByRole("button", { name: en.checks.messages["no-crew"]() }));
    expect(state().workspace).toBe("ship");
    expect(within(inspector()).getByText(en.crew.noCrew)).toBeInTheDocument();
  });
});

describe("Ship workspace: info", () => {
  it("edits the hangar texts and explains them on hover", async () => {
    await setUp();
    commit(within(inspector()).getByLabelText(en.hangar.name), "The T");
    expect(bp().texts.name).toEqual({ kind: "text", text: "The T" });
    expect(screen.getAllByText("The T").length).toBeGreaterThan(0);
    fireEvent.focus(within(inspector()).getByLabelText(en.hangar.name));
    expect(
      within(screen.getByRole("tooltip")).getByText(en.help.shipName.body)
    ).toBeInTheDocument();
    const info = within(inspector()).getByRole("region", { name: en.sections.info });
    const save = within(info).getByRole("group", { name: en.hangar.saveName });
    expect(within(save).getByLabelText(en.hangar.blueprintName)).toHaveValue(bp().name);
    expect(screen.getByRole("button", { name: en.canvas.preview })).toBeInTheDocument();
  });

  it("asks before giving a game ship a new save name", async () => {
    const texts = en.hangar.confirmRename;
    await setUp({ kind: "game" });
    const field = () => within(inspector()).getByLabelText(en.hangar.blueprintName);
    const name = bp().name;

    commit(field(), "MY_T");
    let dialog = await screen.findByRole("dialog", { name: texts.title });
    expect(within(dialog).getByText(texts.message)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: en.common.cancel }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(bp().name).toBe(name);
    expect(field()).toHaveValue(name);

    commit(field(), "MY_T");
    dialog = await screen.findByRole("dialog", { name: texts.title });
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(bp().name).toBe(name);

    commit(field(), "MY_T");
    dialog = await screen.findByRole("dialog", { name: texts.title });
    const rename = within(dialog).getByRole("button", { name: texts.confirm });
    expect(rename).toHaveFocus();
    expect(rename).not.toHaveClass("btn--destructive");
    fireEvent.click(rename);
    await waitFor(() => expect(bp().name).toBe("MY_T"));
    expect(steps()).toBe(1);
  });
});
