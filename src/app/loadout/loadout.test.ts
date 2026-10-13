import { describe, expect, it } from "vitest";
import type { Ship } from "../../core";
import { testShip } from "../../testing/layoutFixtures";
import {
  crewTotal,
  isValidId,
  rename,
  setCrew,
  setHull,
  setReactor,
  setText,
} from "../details/rules";
import {
  addAugment,
  addItem,
  items,
  moveItem,
  removeAugment,
  removeItems,
  setDroneParts,
  setMissiles,
  setSlots,
  slots,
} from "./rules";

function armed(): Ship {
  const ship = testShip();
  return {
    ...ship,
    blueprint: {
      ...ship.blueprint,
      weaponSlots: 3,
      droneSlots: 2,
      weaponList: { count: 2, missiles: 8, items: ["A", "B"] },
      crew: [{ amount: 2, race: "human" }],
    },
  };
}

describe("weapons and drones", () => {
  it("fill the next free slot, keeping count equal to the items, until full", () => {
    let ship = addItem(armed(), "weapon", "C").ship!;
    expect(ship.blueprint.weaponList).toEqual({ count: 3, missiles: 8, items: ["A", "B", "C"] });
    expect(addItem(ship, "weapon", "D")).toEqual({ problem: "full" });
    ship = addItem(ship, "drone", "BOT").ship!;
    expect(ship.blueprint.droneList).toEqual({ count: 1, items: ["BOT"] });
  });

  it("keep a list without count without one", () => {
    const base = armed();
    const ship = { ...base, blueprint: { ...base.blueprint, weaponList: { items: ["A"] } } };
    expect(addItem(ship, "weapon", "B").ship!.blueprint.weaponList).toEqual({ items: ["A", "B"] });
  });

  it("are removed and reordered", () => {
    let ship = addItem(armed(), "weapon", "C").ship!;
    ship = moveItem(ship, "weapon", 0, 1);
    expect(items(ship, "weapon")).toEqual(["B", "A", "C"]);
    expect(moveItem(ship, "weapon", 2, 1)).toBe(ship);
    ship = removeItems(ship, "weapon", [0, 2]);
    expect(ship.blueprint.weaponList).toEqual({ count: 1, missiles: 8, items: ["A"] });
  });

  it("have slots between the items in them and the editor's limits", () => {
    const ship = armed();
    expect(setSlots(ship, "weapon", 12).blueprint.weaponSlots).toBe(8);
    expect(setSlots(ship, "weapon", 0).blueprint.weaponSlots).toBe(2);
    expect(setSlots(ship, "drone", 7).blueprint.droneSlots).toBe(4);
    expect(setSlots(ship, "drone", -1).blueprint.droneSlots).toBe(0);
    const enemy = { ...ship, blueprint: { ...ship.blueprint, weaponSlots: undefined } };
    expect(slots(enemy, "weapon")).toBe(2);
  });

  it("set missiles and drone parts, at least 0", () => {
    let ship = setMissiles(armed(), 12);
    expect(ship.blueprint.weaponList).toMatchObject({ missiles: 12, items: ["A", "B"] });
    ship = setMissiles(ship, -3);
    expect(ship.blueprint.weaponList?.missiles).toBe(0);
    ship = setDroneParts(ship, 4);
    expect(ship.blueprint.droneList).toEqual({ count: 0, items: [], drones: 4 });
  });
});

describe("augments", () => {
  it("are at most three, and once each unless they stack", () => {
    let ship = addAugment(armed(), "SCRAP").ship!;
    expect(addAugment(ship, "SCRAP")).toEqual({ problem: "duplicate" });
    ship = addAugment(ship, "SCRAP", true).ship!;
    ship = addAugment(ship, "RELOAD").ship!;
    expect(ship.blueprint.augments).toEqual(["SCRAP", "SCRAP", "RELOAD"]);
    expect(addAugment(ship, "OTHER")).toEqual({ problem: "full" });
    expect(removeAugment(ship, 1).blueprint.augments).toEqual(["SCRAP", "RELOAD"]);
  });
});

describe("details", () => {
  it("store texts inline, an empty one removed", () => {
    let ship = setText(armed(), "name", "Red Kestrel");
    expect(ship.blueprint.texts.name).toEqual({ kind: "text", text: "Red Kestrel" });
    ship = setText(ship, "name", "  ");
    expect("name" in ship.blueprint.texts).toBe(false);
  });

  it("rename the blueprint and the file base name, refusing invalid ids", () => {
    const ship = rename(armed(), { name: "RED", base: "red_ship" })!;
    expect(ship.blueprint).toMatchObject({ name: "RED", layout: "red_ship", img: "red_ship" });
    expect(rename(armed(), { name: "RED SHIP" })).toBeUndefined();
    expect(isValidId("a_1")).toBe(true);
    expect(isValidId("")).toBe(false);
  });

  it("keep hull and reactor within their limits", () => {
    expect(setHull(armed(), 0).blueprint.health).toBe(1);
    expect(setHull(armed(), 250).blueprint.health).toBe(100);
    expect(setReactor(armed(), 30).blueprint.maxPower).toBe(25);
    expect(setReactor(armed(), 0).blueprint.maxPower).toBe(1);
  });

  it("keep the crew at most eight and drop races with none", () => {
    let ship = setCrew(armed(), "engi", 9);
    expect(ship.blueprint.crew).toEqual([
      { amount: 2, race: "human" },
      { amount: 6, race: "engi" },
    ]);
    expect(crewTotal(ship)).toBe(8);
    ship = setCrew(ship, "human", 0);
    expect(ship.blueprint.crew).toEqual([{ amount: 6, race: "engi" }]);
    expect(setCrew(ship, "rock", 0)).toBe(ship);
  });
});
