import { describe, expect, it } from "vitest";
import type { Catalogs, Ship } from "../../core";
import { testShip } from "../../testing/layoutFixtures";
import { loadoutChecks } from "../checks";

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

describe("Loadout and Details checks", () => {
  const origin = { file: "data/blueprints.xml", fromMod: false };
  const catalogs = {
    weapons: [{ name: "A", ...origin }],
    drones: [{ name: "BOT", ...origin }],
  } as unknown as Catalogs;

  it("report extra items, unknown items, no crew and no hull points", () => {
    const base = armed();
    const ship: Ship = {
      ...base,
      blueprint: {
        ...base.blueprint,
        weaponSlots: 1,
        droneSlots: 0,
        droneList: { items: ["BOT"] },
        crew: [],
        health: 0,
      },
    };
    expect(loadoutChecks(ship, catalogs)).toEqual([
      { code: "too-many-weapons", workspace: "loadout" },
      { code: "too-many-drones", workspace: "loadout" },
      { code: "unknown-weapon", weapon: 1, item: "B", workspace: "loadout" },
      { code: "no-crew", workspace: "details" },
      { code: "no-hull-points", workspace: "details", severity: "problem" },
    ]);
    expect(loadoutChecks(armed(), undefined)).toEqual([]);
  });
});
