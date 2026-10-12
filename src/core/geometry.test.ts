import { describe, expect, it } from "vitest";
import {
  anchorCells,
  anchorPx,
  CELL_SIZE,
  cellToPx,
  cloakPositionPx,
  doorCells,
  doorMatchesGeometry,
  doorRooms,
  doorSegmentPx,
  doorSides,
  floorPositionPx,
  gibPositionPx,
  hullRectPx,
  hullToShipPx,
  mountPositionPx,
  pxToCell,
  roomAtCell,
  roomContainsCell,
  roomRectPx,
  roomsBoundsCells,
  roomsBoundsPx,
  shieldEllipsePx,
  shipToHullPx,
  stationCellPx,
  stationCellToXY,
  stationInRoom,
  stationXYToCell,
} from "./geometry";
import type { ShipLayout, ShipLayoutXml } from "./model";

// Two rooms side by side, anchored at cell (2, 1):
//   room 0: cells (0..1, 0)       2×1
//   room 1: cells (2..3, 0..1)    2×2
const LAYOUT: ShipLayout = {
  xOffset: 2,
  yOffset: 1,
  ellipse: { halfWidth: 100, halfHeight: 50, offsetX: -10, offsetY: 5 },
  rooms: [
    { id: 0, x: 0, y: 0, w: 2, h: 1 },
    { id: 1, x: 2, y: 0, w: 2, h: 2 },
  ],
  doors: [
    { x: 2, y: 0, roomA: 0, roomB: 1, vertical: true },
    { x: 0, y: 1, roomA: 0, roomB: -1, vertical: false },
  ],
};

const XML: ShipLayoutXml = {
  img: { x: -20, y: -30, w: 300, h: 200 },
  floorOffset: { x: 14, y: 24 },
  cloakOffset: { x: -5, y: -6 },
  mounts: [{ x: 100, y: 10, rotate: false, mirror: false, gib: 1 }],
  gibs: [
    {
      velocity: { min: 0, max: 1 },
      direction: { min: 0, max: 1 },
      angular: { min: 0, max: 1 },
      x: 7,
      y: 8,
    },
  ],
};

describe("anchor and cells", () => {
  it("treats a missing anchor as 0", () => {
    expect(anchorCells({})).toEqual({ x: 0, y: 0 });
    expect(anchorPx({ xOffset: 2 })).toEqual({ x: 70, y: 0 });
    expect(CELL_SIZE).toBe(35);
  });

  it("converts cells to pixels and back", () => {
    expect(cellToPx(LAYOUT, 0, 0)).toEqual({ x: 70, y: 35 });
    expect(cellToPx(LAYOUT, 3, 1)).toEqual({ x: 175, y: 70 });
    expect(pxToCell(LAYOUT, 70, 35)).toEqual({ x: 0, y: 0 });
    expect(pxToCell(LAYOUT, 104, 69)).toEqual({ x: 0, y: 0 });
    expect(pxToCell(LAYOUT, 69, 34)).toEqual({ x: -1, y: -1 });
  });

  it("gives room rectangles and bounds", () => {
    expect(roomRectPx(LAYOUT, LAYOUT.rooms[1])).toEqual({ x: 140, y: 35, w: 70, h: 70 });
    expect(roomsBoundsCells(LAYOUT)).toEqual({ x: 0, y: 0, w: 4, h: 2 });
    expect(roomsBoundsPx(LAYOUT)).toEqual({ x: 70, y: 35, w: 140, h: 70 });
    expect(roomsBoundsCells({ rooms: [] })).toBeUndefined();
  });

  it("finds the room at a cell", () => {
    expect(roomAtCell(LAYOUT, 1, 0)?.id).toBe(0);
    expect(roomAtCell(LAYOUT, 3, 1)?.id).toBe(1);
    expect(roomAtCell(LAYOUT, 1, 1)).toBeUndefined();
    expect(roomContainsCell(LAYOUT.rooms[0], 2, 0)).toBe(false);
  });

  it("places the shield ellipse on the rooms centre plus the offset", () => {
    expect(shieldEllipsePx(LAYOUT)).toEqual({ cx: 70 + 70 - 10, cy: 35 + 35 + 5, rx: 100, ry: 50 });
  });
});

describe("pictures", () => {
  it("places the hull at anchor + img", () => {
    expect(hullRectPx(LAYOUT, XML)).toEqual({ x: 50, y: 5, w: 300, h: 200 });
    expect(hullToShipPx(LAYOUT, XML, { x: 1, y: 2 })).toEqual({ x: 51, y: 7 });
    expect(shipToHullPx(LAYOUT, XML, { x: 51, y: 7 })).toEqual({ x: 1, y: 2 });
  });

  it("places floor and cloak relative to the hull corner", () => {
    expect(floorPositionPx(LAYOUT, XML)).toEqual({ x: 64, y: 29 });
    expect(cloakPositionPx(LAYOUT, XML)).toEqual({ x: 45, y: -1 });
    expect(floorPositionPx(LAYOUT, { img: XML.img })).toEqual({ x: 50, y: 5 });
  });

  it("places mounts and gibs in ship pixels", () => {
    expect(mountPositionPx(LAYOUT, XML, XML.mounts[0])).toEqual({ x: 150, y: 15 });
    expect(gibPositionPx(LAYOUT, XML, XML.gibs[0])).toEqual({ x: 57, y: 13 });
  });
});

describe("doors", () => {
  it("finds the cells on both sides", () => {
    expect(doorCells({ x: 2, y: 0, vertical: true })).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(doorCells({ x: 0, y: 1, vertical: false })).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ]);
  });

  it("gives the wall segment in ship pixels", () => {
    expect(doorSegmentPx(LAYOUT, { x: 2, y: 0, vertical: true })).toEqual({
      x1: 140,
      y1: 35,
      x2: 140,
      y2: 70,
    });
    expect(doorSegmentPx(LAYOUT, { x: 0, y: 1, vertical: false })).toEqual({
      x1: 70,
      y1: 70,
      x2: 105,
      y2: 70,
    });
  });

  it("derives the connected rooms from the geometry", () => {
    expect(doorSides(LAYOUT, LAYOUT.doors[0])).toEqual([0, 1]);
    expect(doorRooms(LAYOUT, LAYOUT.doors[0])).toEqual([0, 1]);
    // Airlock below room 0: space is on the bottom side.
    expect(doorSides(LAYOUT, LAYOUT.doors[1])).toEqual([0, -1]);
    expect(doorRooms(LAYOUT, LAYOUT.doors[1])).toEqual([0, -1]);
    // Airlock left of room 0: space is on the left side, still written room, -1.
    expect(doorSides(LAYOUT, { x: 0, y: 0, vertical: true })).toEqual([-1, 0]);
    expect(doorRooms(LAYOUT, { x: 0, y: 0, vertical: true })).toEqual([0, -1]);
    // Nothing on either side.
    expect(doorRooms(LAYOUT, { x: 9, y: 9, vertical: true })).toEqual([-1, -1]);
  });

  it("accepts inner doors in either order, airlocks only as room, -1", () => {
    expect(doorMatchesGeometry(LAYOUT, { x: 2, y: 0, roomA: 1, roomB: 0, vertical: true })).toBe(
      true
    );
    expect(doorMatchesGeometry(LAYOUT, { x: 2, y: 0, roomA: 1, roomB: 1, vertical: true })).toBe(
      false
    );
    expect(doorMatchesGeometry(LAYOUT, { x: 0, y: 1, roomA: -1, roomB: 0, vertical: false })).toBe(
      false
    );
    expect(doorMatchesGeometry(LAYOUT, LAYOUT.doors[1])).toBe(true);
  });
});

describe("stations", () => {
  const room = { id: 1, x: 2, y: 0, w: 2, h: 2 };

  it("converts cell index to x, y and back (row by row)", () => {
    expect(stationCellToXY(room, 0)).toEqual({ x: 0, y: 0 });
    expect(stationCellToXY(room, 1)).toEqual({ x: 1, y: 0 });
    expect(stationCellToXY(room, 3)).toEqual({ x: 1, y: 1 });
    expect(stationCellToXY({ w: 3 }, 4)).toEqual({ x: 1, y: 1 });
    for (let n = 0; n < 6; n++) {
      const p = stationCellToXY({ w: 3 }, n);
      expect(stationXYToCell({ w: 3 }, p.x, p.y)).toBe(n);
    }
  });

  it("checks the index against the room size", () => {
    expect(stationInRoom(room, 3)).toBe(true);
    expect(stationInRoom(room, 4)).toBe(false);
    expect(stationInRoom(room, -1)).toBe(false);
  });

  it("gives the station cell in ship pixels", () => {
    expect(stationCellPx(LAYOUT, room, 3)).toEqual({ x: (2 + 3) * 35, y: (1 + 1) * 35 });
  });
});
