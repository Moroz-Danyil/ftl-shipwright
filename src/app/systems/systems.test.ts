import { describe, expect, it } from "vitest";
import type { ShipSystem, SystemCatalogEntry } from "../../core";
import { medbay, pilot, shields, testShip } from "../../testing/layoutFixtures";
import { allChecks, systemChecks } from "../checks";
import {
  artilleryWeapons,
  interiorFits,
  interiorsFor,
  isUnusualMix,
  maxLevel,
  placeSystem,
  removeSystemNamed,
  roomsWithSeveralInstalled,
  roomsWithUnusualMix,
  setArtilleryWeapon,
  setInstalled,
  setInterior,
  setLevel,
  setUpgradeLimit,
  showsUpgradeLimit,
} from "./rules";

const origin = { file: "data/blueprints.xml", fromMod: false };
const catalog: SystemCatalogEntry[] = [
  { name: "shields", startPower: 2, maxPower: 8, ...origin },
  { name: "clonebay", startPower: 1, maxPower: 3, ...origin },
  { name: "oxygen", maxPower: 3, ...origin },
];

describe("placing systems", () => {
  it("adds a system installed at its starting level", () => {
    const ship = placeSystem(testShip(), "shields", 2, { catalog }).ship!;
    expect(ship.blueprint.systems).toEqual([{ system: "shields", power: 2, room: 2, start: true }]);
  });

  it("makes a newcomer bought later in a room with an installed system", () => {
    const ship = placeSystem(testShip([medbay]), "clonebay", 1, { catalog }).ship!;
    expect(ship.blueprint.systems[1]).toEqual({
      system: "clonebay",
      power: 1,
      room: 1,
      start: false,
    });
  });

  it("keeps each system once: placing it again moves it", () => {
    const ship = placeSystem(testShip([shields, medbay]), "shields", 2).ship!;
    expect(ship.blueprint.systems.filter((s) => s.system === "shields")).toEqual([
      { system: "shields", power: 2, room: 2, start: true },
    ]);
  });

  it("drops the crew station and kept cells when a system moves", () => {
    const moved = placeSystem(testShip([pilot, medbay]), "pilot", 0).ship!;
    expect(moved.blueprint.systems[0]).toEqual({ system: "pilot", power: 1, room: 0, start: true });
    const medbayMoved = placeSystem(testShip([medbay]), "medbay", 2).ship!;
    expect("slot" in medbayMoved.blueprint.systems[0]).toBe(false);
  });

  it("moves a system into a room with an installed one as bought later", () => {
    const ship = placeSystem(testShip([pilot, shields]), "shields", 1).ship!;
    expect(ship.blueprint.systems[1]).toMatchObject({ room: 1, start: false });
  });

  it("refuses a drop into the room the system is in, or into no room", () => {
    expect(placeSystem(testShip([shields]), "shields", 0)).toEqual({ problem: "sameRoom" });
    expect(placeSystem(testShip(), "shields", 9)).toEqual({ problem: "noRoom" });
  });

  it("gives artillery its weapon", () => {
    const ship = placeSystem(testShip(), "artillery", 2, {
      artilleryWeapon: "ARTILLERY_FED",
    }).ship!;
    expect(ship.blueprint.systems[0]).toMatchObject({
      system: "artillery",
      weapon: "ARTILLERY_FED",
    });
    expect(setArtilleryWeapon(ship, 0, "ARTILLERY_X").blueprint.systems[0].weapon).toBe(
      "ARTILLERY_X"
    );
    expect(artilleryWeapons([{ name: "ARTILLERY_FED" }, { name: "LASER_BURST_1" }])).toEqual([
      { name: "ARTILLERY_FED" },
    ]);
  });

  it("removes a system", () => {
    const ship = removeSystemNamed(testShip([pilot, shields]), "pilot");
    expect(ship.blueprint.systems.map((s) => s.system)).toEqual(["shields"]);
    expect(removeSystemNamed(ship, "pilot")).toBe(ship);
  });
});

describe("installed at the start", () => {
  const both: ShipSystem[] = [medbay, { system: "clonebay", power: 1, room: 1, start: false }];

  it("works like a radio button within the room", () => {
    let ship = setInstalled(testShip(both), 1, true);
    expect(ship.blueprint.systems.map((s) => s.start)).toEqual([false, true]);
    ship = setInstalled(ship, 1, false);
    expect(ship.blueprint.systems.map((s) => s.start)).toEqual([false, false]);
  });

  it("finds rooms with more than one installed system", () => {
    const ship = testShip([medbay, { system: "clonebay", power: 1, room: 1 }]);
    expect(roomsWithSeveralInstalled(ship)).toEqual([1]);
    expect(roomsWithSeveralInstalled(testShip(both))).toEqual([]);
  });
});

describe("levels", () => {
  it("come from the game's maxPower, with fallbacks", () => {
    expect(maxLevel(catalog, "clonebay")).toBe(3);
    expect(maxLevel(catalog, "artillery")).toBe(4);
    expect(maxLevel(undefined, "shields")).toBe(8);
  });

  it("stay between 1 and the limit", () => {
    const ship = testShip([shields]);
    expect(setLevel(ship, 0, 9, 8).blueprint.systems[0].power).toBe(8);
    expect(setLevel(ship, 0, 0, 8).blueprint.systems[0].power).toBe(1);
    expect(setLevel(ship, 0, 2, 8)).toBe(ship);
    expect(setUpgradeLimit(ship, 0, 12, 8).blueprint.systems[0].max).toBe(8);
  });

  it("show an upgrade limit on enemy ships or when the ship has one", () => {
    const player = testShip([shields]);
    expect(showsUpgradeLimit(player, shields)).toBe(false);
    expect(showsUpgradeLimit(player, { ...shields, max: 4 })).toBe(true);
    const enemy = { ...player, blueprint: { ...player.blueprint, name: "AUTO_BASIC" } };
    expect(showsUpgradeLimit(enemy, shields)).toBe(true);
  });
});

describe("interior pictures", () => {
  it("are meant for a system by name and fit a room at 35 px per cell", () => {
    const all = [
      { name: "room_shields" },
      { name: "room_shields_3" },
      { name: "room_shieldsx" },
      { name: "room_pilot" },
    ];
    expect(interiorsFor(all, "shields").map((p) => p.name)).toEqual([
      "room_shields",
      "room_shields_3",
    ]);
    expect(interiorFits({ w: 2, h: 1 }, { width: 70, height: 35 })).toBe(true);
    expect(interiorFits({ w: 2, h: 2 }, { width: 70, height: 35 })).toBe(false);
  });

  it("are set and removed", () => {
    let ship = setInterior(testShip([shields]), 0, "room_shields_3");
    expect(ship.blueprint.systems[0].img).toBe("room_shields_3");
    ship = setInterior(ship, 0, undefined);
    expect("img" in ship.blueprint.systems[0]).toBe(false);
  });
});

describe("unusual mixes and system checks", () => {
  it("allow only the game's own pairs without a warning", () => {
    expect(isUnusualMix(["medbay", "clonebay"])).toBe(false);
    expect(isUnusualMix(["teleporter", "mind"])).toBe(false);
    expect(isUnusualMix(["shields"])).toBe(false);
    expect(isUnusualMix(["shields", "medbay"])).toBe(true);
    expect(roomsWithUnusualMix(testShip([medbay, { ...shields, room: 1, start: false }]))).toEqual([
      1,
    ]);
  });

  it("report several installed systems, unusual mixes and a misfit cloaking picture", () => {
    const cloak: ShipSystem = { system: "cloaking", power: 1, room: 0, img: "room_cloaking_3" };
    const ship = testShip([medbay, { ...shields, room: 1 }, cloak]);
    const sizes = { room_cloaking_3: { width: 70, height: 70 } };
    expect(systemChecks(ship, sizes)).toEqual([
      { code: "several-installed", rooms: [1], workspace: "systems" },
      { code: "unusual-mix", rooms: [1], workspace: "systems" },
      { code: "cloak-interior-size", rooms: [0], system: 2, workspace: "systems" },
    ]);
    expect(systemChecks(ship, { room_cloaking_3: { width: 70, height: 35 } })).toHaveLength(2);
  });

  it("send core checks to Layout and system ones to Systems", () => {
    const ship = testShip([{ ...shields, room: 7 }]);
    expect(allChecks(ship).map((c) => [c.code, c.workspace])).toEqual([
      ["system-unknown-room", "systems"],
      ["no-crew", "details"],
    ]);
  });
});
