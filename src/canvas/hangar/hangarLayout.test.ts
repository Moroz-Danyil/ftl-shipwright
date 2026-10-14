import { describe, expect, it } from "vitest";
import { createShip, type ShipSystem } from "../../core";
import { viewLimitPx } from "../viewLimit";
import {
  HANGAR_FRAME,
  SCREEN,
  hangarScale,
  hangarScreenPoint,
  hangarShip,
  hangarShipOffset,
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
