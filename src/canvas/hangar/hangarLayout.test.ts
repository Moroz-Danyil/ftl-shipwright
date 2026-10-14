import { describe, expect, it } from "vitest";
import { createShip, type ShipSystem } from "../../core";
import { viewLimitPx } from "../viewLimit";
import {
  HANGAR_FRAME,
  ITEM_SLOT,
  SCREEN,
  SYSTEM_BAR,
  crewCardAt,
  hangarScale,
  hangarScreenPoint,
  hangarShip,
  hangarShipOffset,
  hangarSystemIconPath,
  itemSlotsX,
  powerBars,
  systemColumns,
} from "./hangarLayout";

const system = (name: string, power: number, start?: boolean): ShipSystem => ({
  system: name,
  power,
  room: 0,
  ...(start === undefined ? {} : { start }),
});

function shipWith(systems: ShipSystem[]) {
  const ship = createShip({ name: "PLAYER_SHIP_T", layout: "t", img: "t" });
  return { ...ship, blueprint: { ...ship.blueprint, systems } };
}

describe("the ship on the hangar screen", () => {
  it("puts the Kestrel's frame (anchor 0, 2) where the game draws it", () => {
    const kestrel = { xOffset: 0, yOffset: 2 };
    expect(hangarShipOffset(kestrel)).toEqual(HANGAR_FRAME);
    // The wall between the airlock and the engine room, one cell in.
    expect(hangarScreenPoint(kestrel, { x: 35, y: 105 })).toEqual({ x: 400, y: 135 });
  });

  it("lands the view-limit frame on the same screen place for any offsets", () => {
    for (const layout of [
      { xOffset: 3, yOffset: 1 },
      { xOffset: 0, yOffset: 0, horizontal: 20, vertical: -15 },
      { xOffset: 2, yOffset: 4, horizontal: -35 },
    ]) {
      const frame = viewLimitPx(layout);
      const at = hangarScreenPoint(layout, frame);
      expect(at.x).toBeCloseTo(HANGAR_FRAME.x, 6);
      expect(at.y).toBeCloseTo(HANGAR_FRAME.y, 6);
    }
    expect(hangarShipOffset({ xOffset: 0, yOffset: 0, horizontal: 20, vertical: -15 })).toEqual({
      x: HANGAR_FRAME.x + 20,
      y: HANGAR_FRAME.y - 15,
    });
  });

  it("keeps only the systems installed at the start", () => {
    const ship = shipWith([system("shields", 2), system("drones", 2, false), system("pilot", 1)]);
    expect(hangarShip(ship).blueprint.systems.map((s) => s.system)).toEqual(["shields", "pilot"]);
    const all = shipWith([system("shields", 2)]);
    expect(hangarShip(all)).toBe(all);
  });
});

describe("the systems bar", () => {
  it("has a column per starting system, in the hangar's order", () => {
    const ship = shipWith([
      system("pilot", 1),
      system("doors", 1),
      system("medbay", 1),
      system("clonebay", 1, false),
      system("oxygen", 1),
      system("shields", 2),
      system("weapons", 3),
      system("engines", 2),
      system("drones", 2, false),
    ]);
    const columns = systemColumns(ship);
    expect(columns.map((c) => c.system)).toEqual([
      "shields",
      "engines",
      "oxygen",
      "weapons",
      "medbay",
      "pilot",
      "doors",
    ]);
    expect(columns.map((c) => c.x)).toEqual([373, 411, 449, 487, 525, 563, 601]);
    expect(columns[3].bars).toHaveLength(3);
    expect(hangarSystemIconPath("oxygen")).toBe("img/icons/s_oxygen_green1.png");
  });

  it("stacks the power bars up from the bottom, closer above level 4", () => {
    expect(powerBars(0)).toEqual([]);
    expect(powerBars(2)).toEqual([
      { y: 434, height: 6 },
      { y: 426, height: 6 },
    ]);
    const eight = powerBars(8);
    expect(eight).toHaveLength(8);
    expect(eight[7].y).toBeGreaterThanOrEqual(SYSTEM_BAR.barsTop);
    expect(eight[0].y + eight[0].height).toBe(SYSTEM_BAR.barsBottom);
  });
});

describe("the equipment panel", () => {
  it("places the Kestrel's four weapon slots as measured, and more slots closer", () => {
    expect(itemSlotsX(4)).toEqual([435, 552, 669, 786]);
    expect(itemSlotsX(0)).toEqual([]);
    expect(itemSlotsX(1)).toEqual([Math.round(ITEM_SLOT.centreX - ITEM_SLOT.width / 2)]);
    const eight = itemSlotsX(8);
    expect(eight[7] + ITEM_SLOT.width - eight[0]).toBeLessThanOrEqual(560);
  });

  it("lays the crew cards out row by row", () => {
    expect([0, 1, 2, 3].map(crewCardAt)).toEqual([
      { x: 70, y: 519 },
      { x: 230, y: 519 },
      { x: 70, y: 612 },
      { x: 230, y: 612 },
    ]);
  });
});

describe("the screen's scale", () => {
  it("fits the screen, at whole device pixels when that loses little", () => {
    expect(hangarScale(SCREEN.width, SCREEN.height)).toBe(1);
    expect(hangarScale(2600, 1500)).toBe(2);
    expect(hangarScale(1920, 1080)).toBe(1.5);
    expect(hangarScale(1920, 1080, 2)).toBe(1.5);
    expect(hangarScale(1400, 800)).toBe(1);
    expect(hangarScale(1400, 800, 1.5)).toBeCloseTo(1.09375, 5);
    expect(hangarScale(640, 360)).toBe(0.5);
    expect(hangarScale(0, 0)).toBe(1);
  });
});
