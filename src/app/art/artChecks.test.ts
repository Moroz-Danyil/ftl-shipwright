import { describe, expect, it } from "vitest";
import { memorySource, type Mount } from "../../core";
import { testShip } from "../../testing/layoutFixtures";
import { artChecks } from "../checks";
import { NEW_GIB } from "./gibs";
import { gamePicture, type ShipArt } from "./model";

const mount = (x: number, y: number, gib = 0): Mount => ({
  x,
  y,
  rotate: false,
  mirror: false,
  gib,
});

function hulled(mounts: Mount[] = [], gibs = 0) {
  const ship = testShip();
  return {
    ...ship,
    layoutXml: {
      ...ship.layoutXml,
      img: { x: -10, y: -20, w: 200, h: 100 },
      mounts,
      gibs: Array.from({ length: gibs }, (_, i) => ({ ...NEW_GIB, x: i * 10, y: 0 })),
    },
  };
}

const art = (extra: Partial<ShipArt> = {}): ShipArt => ({
  source: memorySource({}),
  gibs: [],
  ...extra,
});

describe("Hull checks", () => {
  it("report missing pictures, too few mounts, gibs without pictures and broken gib links", () => {
    const base = hulled([mount(0, 0, 3)], 2);
    const ship = { ...base, blueprint: { ...base.blueprint, weaponSlots: 3 } };
    expect(artChecks(ship, art({ gibs: [gamePicture("g1"), null] }))).toEqual([
      { code: "no-hull", workspace: "hull", severity: "problem" },
      { code: "no-shield", workspace: "hull" },
      { code: "no-ship-icon", workspace: "hull" },
      { code: "few-mounts", workspace: "hull" },
      { code: "gib-no-picture", gib: 1, workspace: "hull" },
      { code: "mount-gib-missing", mount: 0, workspace: "hull" },
    ]);
    const pictured = art({ hull: gamePicture("h"), shield: gamePicture("s") });
    expect(artChecks(hulled(), { ...pictured, miniship: gamePicture("m") })).toEqual([]);
    expect(artChecks(hulled(), pictured)).toEqual([{ code: "no-ship-icon", workspace: "hull" }]);
    const enemy = hulled();
    enemy.blueprint = { ...enemy.blueprint, name: "AUTO_T" };
    expect(artChecks(enemy, pictured)).toEqual([]);
  });
});
