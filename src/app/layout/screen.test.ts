import { describe, expect, it } from "vitest";
import {
  addRoom,
  createShip,
  hullRectPx,
  loadShip,
  roomRectPx,
  saveShip,
  type Ship,
} from "../../core";
import { roomsOffScreen, roomsOutOfView } from "../checks";
import { HAS_GAME_DATA, readData, vanillaShips } from "../../core/testing/gameData";
import { isPlayerShip, viewLimitPx } from "../../canvas/viewLimit";
import { testShip } from "../../testing/layoutFixtures";
import {
  GAME_SHIP_SPOT,
  centreOnScreen,
  frameMiddlePx,
  offCentrePx,
  shipBoxPx,
  shipSpotPx,
} from "./screen";

/** The test ship with a 301 × 200 hull picture around its rooms, far from the game's spot. */
function shipWithHull(): Ship {
  const ship = testShip();
  return {
    ...ship,
    layout: { ...ship.layout, xOffset: 0, yOffset: 0, vertical: 0 },
    layoutXml: { ...ship.layoutXml, img: { x: -40, y: -60, w: 301, h: 200 } },
  };
}

/** How far the middle of the ship's rooms and hull lies from the frame's middle. */
function fromFrameMiddle(ship: Ship) {
  const box = shipBoxPx(ship)!;
  const middle = frameMiddlePx(ship);
  return { x: box.x + box.w / 2 - middle.x, y: box.y + box.h / 2 - middle.y };
}

describe("the ship on the game's screen", () => {
  it("measures the rooms and the hull together", () => {
    const ship = shipWithHull();
    expect(shipBoxPx(ship)).toEqual({ x: -40, y: -60, w: 301, h: 200 });
    const noHull = testShip();
    expect(shipBoxPx(noHull)).toEqual({ x: 35, y: 35, w: 175, h: 70 });
    expect(shipBoxPx(createShip({ name: "E", layout: "e", img: "e" }))).toBeUndefined();
  });

  it("tells how far the ship's middle is from where the game places its ships", () => {
    const ship = shipWithHull();
    expect(frameMiddlePx(ship)).toEqual({ x: 332.5, y: 227.5 });
    expect(shipSpotPx(ship)).toEqual({ x: 332.5 - 65, y: 227.5 - 50 });
    expect(offCentrePx(ship)).toEqual({ x: 110.5 - 267.5, y: 40 - 177.5 });
  });

  it("places the ship with whole cells for the anchor and the rest in pixels", () => {
    const ship = shipWithHull();
    const placed = centreOnScreen(ship);
    const off = offCentrePx(placed);
    expect(Math.abs(off.x)).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(Math.abs(off.y)).toBeLessThanOrEqual(0.5 + 1e-9);
    const middle = fromFrameMiddle(placed);
    expect(Math.abs(middle.x - GAME_SHIP_SPOT.x)).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(Math.abs(middle.y - GAME_SHIP_SPOT.y)).toBeLessThanOrEqual(0.5 + 1e-9);
    const { xOffset, yOffset, horizontal, vertical } = placed.layout;
    expect(Number.isInteger(xOffset)).toBe(true);
    expect(Number.isInteger(yOffset)).toBe(true);
    expect(Math.abs(horizontal!)).toBeLessThanOrEqual(18);
    expect(Math.abs(vertical!)).toBeLessThanOrEqual(18);
    // Rooms, doors and pictures keep their numbers: they move together.
    expect(placed.layout.rooms).toBe(ship.layout.rooms);
    expect(placed.layout.doors).toBe(ship.layout.doors);
    expect(placed.layoutXml).toBe(ship.layoutXml);
    const hull = hullRectPx(placed.layout, placed.layoutXml);
    const room = roomRectPx(placed.layout, placed.layout.rooms[0]);
    expect([room.x - hull.x, room.y - hull.y]).toEqual([40, 60]);
  });

  it("leaves a ship that is placed already as it is", () => {
    const placed = centreOnScreen(shipWithHull());
    expect(centreOnScreen(placed)).toBe(placed);
  });

  it("keeps HORIZONTAL out of a layout that has none when no pixels are left over", () => {
    let ship = createShip({ name: "E", layout: "e", img: "e" });
    // A 35 px hull whose middle is 22.5 px right of the anchor: 7 whole cells, no pixels.
    ship = { ...ship, layoutXml: { ...ship.layoutXml, img: { x: 5, y: 0, w: 35, h: 35 } } };
    const placed = centreOnScreen(ship);
    expect(placed.layout).toMatchObject({ xOffset: 7, yOffset: 5, vertical: -15 });
    expect(placed.layout.horizontal).toBeUndefined();
  });

  it("puts cell (0, 0) of an empty ship where the game places its ships", () => {
    const empty = centreOnScreen(createShip({ name: "E", layout: "e", img: "e" }));
    expect(empty.layout).toMatchObject({ xOffset: 7, yOffset: 5, horizontal: 5, vertical: -15 });
    expect(offCentrePx(empty)).toEqual({ x: 0, y: 0 });
  });

  it("keeps every room inside the frame when the ship fits, as near the spot as it can", () => {
    // 17 cells of rooms: at the spot they would stick out 30 px on the left, so the ship stops at
    // the frame's left edge.
    let ship = createShip({ name: "PLAYER_SHIP_T", layout: "t", img: "t" });
    ship = addRoom(ship, { x: 0, y: 0, w: 17, h: 3 });
    const placed = centreOnScreen(ship);
    expect(roomsOffScreen(placed)).toEqual([]);
    const frame = viewLimitPx(placed.layout);
    expect(roomRectPx(placed.layout, placed.layout.rooms[0]).x).toBe(frame.x);
    expect(offCentrePx(placed).y).toBeCloseTo(0, 0);
    const written = loadShip(saveShip(placed)).layout;
    expect(written.xOffset).toBeGreaterThanOrEqual(0);
    expect(written.yOffset).toBeGreaterThanOrEqual(0);
  });

  it("brings rooms outside the frame back inside", () => {
    let ship = createShip({ name: "PLAYER_SHIP_T", layout: "t", img: "t" });
    ship = addRoom(ship, { x: 0, y: -4, w: 2, h: 2 });
    ship = addRoom(ship, { x: 0, y: -2, w: 4, h: 2 });
    expect(roomsOffScreen(ship)).toEqual([0, 1]);
    expect(roomsOffScreen(centreOnScreen(ship))).toEqual([]);
  });

  it("puts rooms bigger than the frame at its left and top edges, never past them", () => {
    let ship = createShip({ name: "PLAYER_SHIP_T", layout: "t", img: "t" });
    ship = addRoom(ship, { x: 0, y: 0, w: 21, h: 14 });
    const placed = centreOnScreen(ship);
    const frame = viewLimitPx(placed.layout);
    const room = roomRectPx(placed.layout, placed.layout.rooms[0]);
    expect([room.x, room.y]).toEqual([frame.x, frame.y]);
    expect(roomsOffScreen(placed)).toEqual([]);
    expect(roomsOutOfView(placed)).toEqual([0]);
  });

  it.skipIf(!HAS_GAME_DATA)("matches the spot measured on the game's player ships", () => {
    const layouts = new Map<string, { x: number; y: number }>();
    for (const b of vanillaShips().filter((s) => isPlayerShip(s.name))) {
      const ship = loadShip({
        blueprintXml: b.xml,
        layoutTxt: readData(`${b.layout}.txt`),
        layoutXml: readData(`${b.layout}.xml`),
      });
      layouts.set(b.layout, fromFrameMiddle(ship));
    }
    const all = [...layouts.values()];
    expect(all.length).toBeGreaterThan(20);
    const x = all.reduce((sum, p) => sum + p.x, 0) / all.length;
    const y = all.reduce((sum, p) => sum + p.y, 0) / all.length;
    expect(Math.abs(x - GAME_SHIP_SPOT.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(y - GAME_SHIP_SPOT.y)).toBeLessThanOrEqual(1);
  });
});
