import { describe, expect, it } from "vitest";
import {
  addDoor,
  addRoom,
  createShip,
  loadShip,
  parseLayoutTxt,
  roomsBoundsCells,
  type Ship,
} from "../core";
import { HAS_GAME_DATA, readData, vanillaShips } from "../core/testing/gameData";
import { directionTo, draggedDirection, fanPath, pointAt } from "./directionFan";
import { doorKind } from "./doors";
import { shipBounds } from "./fit";
import { hitTest } from "./hitTest";
import { pngSize } from "./pictures";
import { isPlayerShip, viewLimitCells, viewLimitPx } from "./viewLimit";
import {
  MAX_SCALE,
  MIN_SCALE,
  fitRect,
  panBy,
  screenToShip,
  shipToScreen,
  unionRects,
  wheelFactor,
  easeScale,
  zoomAt,
} from "./viewport";

describe("viewport", () => {
  it("converts between screen and ship pixels", () => {
    const camera = { x: 100, y: 50, scale: 2 };
    expect(shipToScreen(camera, { x: 10, y: 20 })).toEqual({ x: 120, y: 90 });
    expect(screenToShip(camera, { x: 120, y: 90 })).toEqual({ x: 10, y: 20 });
  });

  it("zooms around the cursor", () => {
    const camera = { x: 10, y: 20, scale: 1 };
    const at = { x: 300, y: 200 };
    const before = screenToShip(camera, at);
    const zoomed = zoomAt(camera, 2, at);
    expect(zoomed.scale).toBe(2);
    const after = screenToShip(zoomed, at);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("keeps the zoom within its limits", () => {
    expect(zoomAt({ x: 0, y: 0, scale: 1 }, 1000, { x: 0, y: 0 }).scale).toBe(MAX_SCALE);
    expect(zoomAt({ x: 0, y: 0, scale: 1 }, 0.0001, { x: 0, y: 0 }).scale).toBe(MIN_SCALE);
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(100) * wheelFactor(-100)).toBeCloseTo(1);
  });

  it("zooms 6 % per wheel notch, easing towards the target", () => {
    expect(wheelFactor(-100)).toBeCloseTo(1.06);
    expect(wheelFactor(-300)).toBeCloseTo(1.06 ** 3);
    let scale = 1;
    for (let i = 0; i < 4; i++) {
      const next = easeScale(scale, 2);
      expect(next).toBeGreaterThan(scale);
      expect(next).toBeLessThanOrEqual(2);
      scale = next;
    }
    expect(scale).toBeLessThan(2);
    for (let i = 0; i < 40; i++) scale = easeScale(scale, 2);
    expect(scale).toBe(2);
  });

  it("pans and fits", () => {
    expect(panBy({ x: 1, y: 2, scale: 3 }, 10, -5)).toEqual({ x: 11, y: -3, scale: 3 });
    const camera = fitRect({ x: 100, y: 100, w: 400, h: 200 }, { width: 896, height: 696 }, 48);
    expect(camera.scale).toBe(2);
    expect(shipToScreen(camera, { x: 300, y: 200 })).toEqual({ x: 448, y: 348 });
  });

  it("joins rectangles", () => {
    expect(unionRects([undefined, { x: 0, y: 0, w: 0, h: 0 }])).toBeUndefined();
    expect(
      unionRects([
        { x: 0, y: 5, w: 10, h: 10 },
        { x: -5, y: 0, w: 5, h: 5 },
      ])
    ).toEqual({ x: -5, y: 0, w: 15, h: 15 });
  });
});

describe("view limit frame", () => {
  it("puts the right and bottom edges where the game shows them", () => {
    const layout = { xOffset: 2, yOffset: 3, horizontal: 70, vertical: -35 };
    const cells = viewLimitCells(layout);
    expect(cells.right).toBe(19 - 2 - 2);
    expect(cells.bottom).toBe(13 - 3 + 1);
    expect(cells.left).toBe(cells.right - 19);
    expect(cells.top).toBe(cells.bottom - 13);
    expect(viewLimitPx(layout)).toEqual({ x: -70, y: 35, w: 665, h: 455 });
  });

  it("treats missing values as 0 and allows fractions", () => {
    expect(viewLimitCells({})).toEqual({ left: 0, top: 0, right: 19, bottom: 13 });
    expect(viewLimitCells({ horizontal: 10 }).right).toBeCloseTo(19 - 10 / 35);
  });

  it("is only drawn for player ships", () => {
    expect(isPlayerShip("PLAYER_SHIP_HARD")).toBe(true);
    expect(isPlayerShip("AUTO_BASIC")).toBe(false);
  });

  it.skipIf(!HAS_GAME_DATA)("holds the rooms of every vanilla player ship", () => {
    const players = vanillaShips().filter((b) => isPlayerShip(b.name));
    expect(players.length).toBeGreaterThan(20);
    for (const b of players) {
      const layout = parseLayoutTxt(readData(`${b.layout}.txt`));
      const rooms = roomsBoundsCells(layout)!;
      const frame = viewLimitCells(layout);
      expect(rooms.x + rooms.w, b.name).toBeLessThanOrEqual(frame.right);
      expect(rooms.y + rooms.h, b.name).toBeLessThanOrEqual(frame.bottom);
    }
  });
});

function testShip(): Ship {
  let ship = createShip({ name: "PLAYER_SHIP_T", layout: "t", img: "t" });
  ship = { ...ship, layout: { ...ship.layout, xOffset: 1, yOffset: 1 } };
  ship = addRoom(ship, { x: 0, y: 0, w: 2, h: 1 });
  ship = addRoom(ship, { x: 2, y: 0, w: 2, h: 2 });
  ship = addDoor(ship, { x: 2, y: 0, vertical: true });
  ship = addDoor(ship, { x: 0, y: 0, vertical: true });
  return addDoor(ship, { x: 9, y: 9, vertical: false });
}

describe("hit test", () => {
  const ship = testShip();

  it("finds doors on their wall before the rooms beside them", () => {
    expect(hitTest(ship, { x: 105, y: 52 })).toEqual({ kind: "door", index: 0 });
    expect(hitTest(ship, { x: 33, y: 52 })).toEqual({ kind: "door", index: 1 });
  });

  it("finds rooms by cell, and nothing in space", () => {
    expect(hitTest(ship, { x: 50, y: 50 })).toEqual({ kind: "room", id: 0 });
    expect(hitTest(ship, { x: 120, y: 95 })).toEqual({ kind: "room", id: 1 });
    expect(hitTest(ship, { x: 50, y: 95 })).toBeNull();
    expect(hitTest(ship, { x: 105, y: 37 })).toEqual({ kind: "room", id: 1 });
  });

  it("names doors by what lies beside them", () => {
    const [inner, airlock, loose] = ship.layout.doors;
    expect(doorKind(ship.layout, inner)).toBe("inner");
    expect(doorKind(ship.layout, airlock)).toBe("airlock");
    expect(doorKind(ship.layout, loose)).toBe("loose");
  });
});

describe("fit", () => {
  it("covers the hull, the rooms and the shield", () => {
    const ship = loadShip({
      blueprintXml: '<shipBlueprint name="A" layout="a" img="a"/>',
      layoutTxt: "X_OFFSET 1 Y_OFFSET 1 ELLIPSE 100 50 0 0 ROOM 0 0 0 2 2",
      layoutXml: '<img x="-10" y="-10" w="100" h="60"/>',
    });
    expect(shipBounds(ship)).toEqual({ x: -30, y: 20, w: 200, h: 100 });
  });

  it("shows the game's frame size for an empty ship", () => {
    const ship = createShip({ name: "E", layout: "e", img: "e" });
    expect(shipBounds(ship)).toEqual({ x: 0, y: 0, w: 665, h: 455 });
  });
});

describe("pictures", () => {
  it("reads a PNG's size from its header", () => {
    const header = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 2, 140, 0,
      0, 1, 162,
    ]);
    expect(pngSize(header)).toEqual({ width: 652, height: 418 });
    expect(pngSize(new Uint8Array([1, 2, 3]))).toBeUndefined();
  });
});

describe("the direction fan", () => {
  const centre = { x: 100, y: 100 };

  it("measures directions from up, clockwise", () => {
    expect(directionTo(centre, { x: 100, y: 50 })).toBe(0);
    expect(directionTo(centre, { x: 150, y: 100 })).toBe(90);
    expect(directionTo(centre, { x: 100, y: 150 })).toBe(180);
    expect(directionTo(centre, { x: 50, y: 100 })).toBe(270);
    const p = pointAt(centre, 90, 10);
    expect(p.x).toBeCloseTo(110);
    expect(p.y).toBeCloseTo(100);
  });

  it("drags to whole degrees, snaps to 15° with Shift and sweeps past 0 and 360", () => {
    const at = (degrees: number) => pointAt(centre, degrees, 50);
    expect(draggedDirection(centre, at(41.4), 30, false)).toBe(41);
    expect(draggedDirection(centre, at(41.4), 30, true)).toBe(45);
    expect(draggedDirection(centre, at(52), 30, true)).toBe(45);
    expect(draggedDirection(centre, at(10), 355, false)).toBe(370);
    expect(draggedDirection(centre, at(340), 5, false)).toBe(-20);
    expect(draggedDirection(centre, at(340), 300, false)).toBe(340);
  });

  it("draws a wedge, a band, and a full ring for a whole turn", () => {
    const fan = { centre, inner: 0, outer: 50, direction: { min: 0, max: 90 } };
    expect(fanPath(fan, 0, 50)).toBe("M100 50A50 50 0 0 1 150 100L100 100Z");
    expect(fanPath(fan, 20, 50)).toBe("M100 50A50 50 0 0 1 150 100L120 100A20 20 0 0 0 100 80Z");
    const back = { ...fan, direction: { min: 90, max: -90 } };
    expect(fanPath(back, 0, 50)).toBe("M150 100A50 50 0 0 0 50 100L100 100Z");
    const whole = { ...fan, direction: { min: 0, max: 360 } };
    expect(fanPath(whole, 0, 50).match(/A/g)).toHaveLength(2);
    expect(fanPath(whole, 20, 50).match(/A/g)).toHaveLength(4);
  });
});
