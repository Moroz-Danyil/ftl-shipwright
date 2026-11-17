import { describe, expect, it } from "vitest";
import { addDoor, setAnchor, updateBlueprint, updateLayout } from "../../core";
import { EMPTY_SELECTION } from "../selection";
import { cellPx as at, medbay, pilot, shields, testShip } from "../../testing/layoutFixtures";
import { addDoorOnWall, doorAt, doorsOfRoom, isDoorWall, nearestWall } from "./doors";
import { deleteSelection, systemsInRooms } from "./remove";
import {
  addRoomChecked,
  changeRoom,
  doorsMovingWith,
  moveRooms,
  placementProblem,
  outOfView,
  rectFromCells,
  roomArea,
  shownCell,
  shownOrigin,
} from "./rooms";
import {
  nearestWallDirection,
  placeStation,
  removeStation,
  setStationDirection,
  stationCellAt,
  stationOf,
  stationSystemsInRoom,
  wallDirections,
} from "./stations";

describe("room placement rules", () => {
  const rooms = testShip().layout.rooms;

  it("allows any cell, negative ones too, and refuses overlaps and empty rooms", () => {
    expect(placementProblem(rooms, [{ x: 0, y: 1, w: 2, h: 1 }])).toBeUndefined();
    expect(placementProblem(rooms, [{ x: -1, y: 1, w: 1, h: 1 }])).toBeUndefined();
    expect(placementProblem(rooms, [{ x: -3, y: -2, w: 2, h: 2 }])).toBeUndefined();
    expect(placementProblem(rooms, [{ x: -1, y: -1, w: 2, h: 2 }])).toBe("overlap");
    expect(placementProblem(rooms, [{ x: 1, y: 0, w: 2, h: 1 }])).toBe("overlap");
    expect(placementProblem(rooms, [{ x: 5, y: 5, w: 0, h: 1 }])).toBe("tooSmall");
    expect(placementProblem(rooms, [{ x: 1, y: 0, w: 2, h: 1 }], new Set([0, 1]))).toBeUndefined();
  });

  it("keeps a player ship's rooms below and right of the frame's top and left edges", () => {
    // Anchor (1, 1), no shift: the frame spans cells -1 to 18 across and -1 to 12 down.
    const area = roomArea(testShip())!;
    expect(area).toEqual({ left: -1, top: -1, right: 18, bottom: 12 });
    const at = (x: number, y: number, w = 1, h = 1) =>
      placementProblem(rooms, [{ x, y, w, h }], new Set(), area);
    expect(at(-1, -1)).toBeUndefined();
    expect(at(-2, 3)).toBe("offScreen");
    expect(at(5, -2)).toBe("offScreen");
    // Past the right and bottom edges rooms are allowed (they are only out of sight in battle).
    expect(at(16, 11, 2, 1)).toBeUndefined();
    expect(at(17, 3, 2, 1)).toBeUndefined();
    expect(at(5, 12)).toBeUndefined();
    expect(at(30, 20)).toBeUndefined();
    // Other ships have no frame.
    expect(roomArea(updateBlueprint(testShip(), { name: "AUTO_T" }))).toBeUndefined();
  });

  it("counts a cell only partly inside a fractional edge as outside", () => {
    // VERTICAL -10 puts the top edge at 13 - 1 + 10 / 35 - 13 = -0.71: row -1 sticks out.
    const ship = updateLayout(testShip(), { vertical: -10 });
    const area = roomArea(ship)!;
    expect(placementProblem(rooms, [{ x: 5, y: 0, w: 1, h: 1 }], new Set(), area)).toBeUndefined();
    expect(placementProblem(rooms, [{ x: 5, y: -1, w: 1, h: 1 }], new Set(), area)).toBe(
      "offScreen"
    );
    // VERTICAL 10 puts the bottom edge at 11.71: row 11 is past it, out of sight.
    const low = addRoomChecked(updateLayout(testShip(), { vertical: 10 }), {
      x: 5,
      y: 11,
      w: 1,
      h: 1,
    }).ship!;
    expect(outOfView(low, [3])).toBe(true);
    expect(outOfView(low, [0, 1, 2])).toBe(false);
  });

  it("never lets rooms go left of or above ship pixel 0, which would save a negative offset", () => {
    // HORIZONTAL 40 moves the frame's left edge to -2.14, but cell -2 is left of pixel 0.
    const ship = updateLayout(testShip(), { horizontal: 40 });
    expect(roomArea(ship)!.left).toBe(-1);
    expect(addRoomChecked(ship, { x: -2, y: 3, w: 1, h: 1 }).problem).toBe("offScreen");
    expect(addRoomChecked(ship, { x: -1, y: 3, w: 1, h: 1 }).ship).toBeDefined();
  });

  it("spans a rectangle between two cells in either order", () => {
    expect(rectFromCells({ x: 3, y: 4 }, { x: 1, y: 2 })).toEqual({ x: 1, y: 2, w: 3, h: 3 });
    expect(rectFromCells({ x: 2, y: 2 }, { x: 2, y: 2 })).toEqual({ x: 2, y: 2, w: 1, h: 1 });
  });

  it("adds a room with the next id only where it fits, and turns loose doors into airlocks", () => {
    let ship = addDoor(testShip(), { x: 0, y: 3, vertical: false });
    expect(ship.layout.doors[4]).toMatchObject({ roomA: -1, roomB: -1 });
    expect(addRoomChecked(ship, { x: 1, y: 0, w: 1, h: 1 }).problem).toBe("overlap");
    ship = addRoomChecked(ship, { x: 0, y: 3, w: 2, h: 1 }).ship!;
    expect(ship.layout.rooms[3]).toEqual({ id: 3, x: 0, y: 3, w: 2, h: 1 });
    expect(ship.layout.doors[4]).toMatchObject({ roomA: 3, roomB: -1 });
  });

  it("draws a room left of and above the others, inside the frame", () => {
    const ship = addRoomChecked(testShip(), rectFromCells({ x: -1, y: 1 }, { x: -1, y: -1 })).ship!;
    expect(ship.layout.rooms[3]).toEqual({ id: 3, x: -1, y: -1, w: 1, h: 3 });
    expect(addRoomChecked(testShip(), { x: -2, y: -1, w: 1, h: 1 }).problem).toBe("offScreen");
    // With more room on the screen, further.
    const moved = setAnchor(testShip(), 4, 3);
    expect(addRoomChecked(moved, { x: -4, y: -3, w: 2, h: 2 }).ship!.layout.rooms[3]).toMatchObject(
      {
        x: -4,
        y: -3,
      }
    );
  });

  it("shows positions from the leftmost and the topmost room", () => {
    const ship = testShip();
    expect(shownOrigin(ship.layout)).toEqual({ x: 0, y: 0 });
    const more = addRoomChecked(ship, { x: -1, y: -1, w: 1, h: 1 }).ship!;
    expect(shownOrigin(more.layout)).toEqual({ x: -1, y: -1 });
    expect(shownCell(more.layout, more.layout.rooms[0])).toEqual({ x: 1, y: 1 });
    expect(shownCell(more.layout, more.layout.rooms[3])).toEqual({ x: 0, y: 0 });
    expect(shownOrigin({ rooms: [] })).toEqual({ x: 0, y: 0 });
  });
});

describe("moving rooms", () => {
  it("takes along the doors whose rooms all move", () => {
    const ship = testShip();
    expect(doorsMovingWith(ship.layout, [0])).toEqual([2]);
    expect(doorsMovingWith(ship.layout, [1])).toEqual([3]);
    expect(doorsMovingWith(ship.layout, [0, 1])).toEqual([0, 2, 3]);
    expect(doorsMovingWith(ship.layout, [0, 1, 2])).toEqual([0, 1, 2, 3]);
  });

  it("moves rooms and their doors by whole cells and updates door rooms", () => {
    const ship = testShip();
    const moved = moveRooms(ship, [2], 0, 2).ship!;
    expect(moved.layout.rooms[2]).toMatchObject({ x: 4, y: 2 });
    expect(moved.layout.doors[1]).toEqual({ x: 4, y: 0, roomA: 1, roomB: -1, vertical: true });
    expect(moved.layout.rooms[0]).toBe(ship.layout.rooms[0]);

    const both = moveRooms(ship, [0, 1], 0, 2).ship!;
    expect(both.layout.doors[0]).toMatchObject({ x: 2, y: 2, roomA: 0, roomB: 1 });
    expect(both.layout.doors[2]).toMatchObject({ x: 0, y: 2, roomA: 0, roomB: -1 });
    expect(both.layout.doors[1]).toMatchObject({ x: 4, y: 0, roomA: 2, roomB: -1 });
  });

  it("moves rooms into negative cells with their doors, but not off the screen", () => {
    const ship = testShip();
    const moved = moveRooms(ship, [0, 1, 2], -1, -1).ship!;
    expect(moved.layout.rooms.map((r) => [r.x, r.y])).toEqual([
      [-1, -1],
      [1, -1],
      [3, -1],
    ]);
    expect(moved.layout.doors[0]).toMatchObject({ x: 1, y: -1, roomA: 0, roomB: 1 });
    expect(moved.layout.doors[2]).toMatchObject({ x: -1, y: -1, roomA: 0, roomB: -1 });
    expect(moveRooms(ship, [0], -1, 0).ship!.layout.rooms[0]).toMatchObject({ x: -1, y: 0 });
    expect(moveRooms(ship, [0, 1, 2], -2, 0)).toEqual({ problem: "offScreen" });
    // Past the right edge: allowed, and out of sight.
    const right = moveRooms(ship, [2], 14, 0).ship!;
    expect(right.layout.rooms[2]).toMatchObject({ x: 18 });
    expect(outOfView(right, [2])).toBe(true);
  });

  it("refuses moves onto other rooms, and leaves the ship alone", () => {
    const ship = testShip();
    expect(moveRooms(ship, [2], -1, 0)).toEqual({ problem: "overlap" });
    expect(moveRooms(ship, [1, 2], -1, 0)).toEqual({ problem: "overlap" });
    expect(moveRooms(ship, [0, 1, 2], 1, 0).ship!.layout.rooms[0].x).toBe(1);
    expect(moveRooms(ship, [0], 0, 0).ship).toBe(ship);
  });

  it("changes a room from the inspector: moving takes its doors, resizing keeps them", () => {
    const ship = testShip();
    const moved = changeRoom(ship, 2, { y: 3 }).ship!;
    expect(moved.layout.rooms[2]).toMatchObject({ x: 4, y: 3 });
    const resized = changeRoom(ship, 0, { h: 2 }).ship!;
    expect(resized.layout.rooms[0]).toMatchObject({ w: 2, h: 2 });
    expect(resized.layout.doors[2]).toBe(ship.layout.doors[2]);
    expect(changeRoom(ship, 0, { w: 3 }).problem).toBe("overlap");
    expect(changeRoom(ship, 0, { x: -1 }).ship!.layout.rooms[0]).toMatchObject({ x: -1, y: 0 });
    expect(changeRoom(ship, 0, { x: -2 }).problem).toBe("offScreen");
    expect(changeRoom(ship, 2, { y: -1, h: 3 }).ship!.layout.rooms[2]).toEqual({
      id: 2,
      x: 4,
      y: -1,
      w: 1,
      h: 3,
    });
    expect(changeRoom(ship, 2, { h: 13 }).ship!.layout.rooms[2]).toMatchObject({ h: 13 });
    expect(changeRoom(ship, 0, { h: 0 }).problem).toBe("tooSmall");
  });
});

describe("doors", () => {
  const ship = testShip();

  it("finds the wall nearest to the pointer, next to a room", () => {
    expect(nearestWall(ship.layout, at(1.95, 0.5))).toEqual({ x: 2, y: 0, vertical: true });
    expect(nearestWall(ship.layout, at(0.5, 0.9))).toEqual({ x: 0, y: 1, vertical: false });
    expect(nearestWall(ship.layout, at(0.5, 0.1))).toEqual({ x: 0, y: 0, vertical: false });
    expect(nearestWall(ship.layout, at(0.95, 0.4))).toEqual({ x: 0, y: 0, vertical: false });
    expect(nearestWall(ship.layout, at(8.5, 8.4))).toBeUndefined();
  });

  it("never offers a wall inside one room", () => {
    expect(isDoorWall(ship.layout, { x: 1, y: 0, vertical: true })).toBe(false);
    expect(isDoorWall(ship.layout, { x: 3, y: 1, vertical: false })).toBe(false);
    expect(isDoorWall(ship.layout, { x: 3, y: 2, vertical: false })).toBe(true);
  });

  it("adds a door with rooms from the geometry, without duplicates", () => {
    const wall = { x: 0, y: 1, vertical: false };
    const added = addDoorOnWall(ship, wall);
    expect(added.index).toBe(4);
    expect(added.ship.layout.doors[4]).toEqual({ ...wall, roomA: 0, roomB: -1 });
    const again = addDoorOnWall(added.ship, wall);
    expect(again.ship).toBe(added.ship);
    expect(again.index).toBe(4);
    expect(doorAt(ship.layout, { x: 2, y: 0, vertical: true })).toBe(0);
  });

  it("finds and adds a door between rooms at negative cells", () => {
    let neg = addRoomChecked(ship, { x: -1, y: -1, w: 1, h: 1 }).ship!;
    neg = addRoomChecked(neg, { x: 0, y: -1, w: 2, h: 1 }).ship!;
    const wall = nearestWall(neg.layout, at(-0.05, -0.5));
    expect(wall).toEqual({ x: 0, y: -1, vertical: true });
    const added = addDoorOnWall(neg, wall!);
    expect(added.ship.layout.doors[added.index]).toEqual({ ...wall, roomA: 3, roomB: 4 });
    expect(nearestWall(neg.layout, at(-0.6, -0.9))).toEqual({ x: -1, y: -1, vertical: false });
    expect(doorsOfRoom(added.ship.layout, 4)).toEqual([added.index]);
  });

  it("counts the doors on a room's walls", () => {
    expect(doorsOfRoom(ship.layout, 1)).toEqual([0, 1, 3]);
    expect(doorsOfRoom(ship.layout, 2)).toEqual([1]);
  });
});

describe("crew stations", () => {
  it("numbers the cells of a room row by row", () => {
    const room = { id: 1, x: 2, y: 0, w: 2, h: 2 };
    expect(stationCellAt(room, { x: 2, y: 0 })).toBe(0);
    expect(stationCellAt(room, { x: 3, y: 0 })).toBe(1);
    expect(stationCellAt(room, { x: 2, y: 1 })).toBe(2);
    expect(stationCellAt(room, { x: 3, y: 1 })).toBe(3);
    expect(stationCellAt(room, { x: 4, y: 1 })).toBeUndefined();
  });

  it("knows which directions face a wall", () => {
    expect(wallDirections({ w: 2, h: 2 }, 3)).toEqual(["right", "down"]);
    expect(wallDirections({ w: 3, h: 3 }, 4)).toEqual([]);
    expect(nearestWallDirection({ w: 3, h: 1 }, 2)).toBe("right");
    expect(nearestWallDirection({ w: 1, h: 3 }, 2)).toBe("left");
  });

  it("lists only the systems with crew stations", () => {
    const ship = testShip([medbay, pilot, shields]);
    expect(stationSystemsInRoom(ship, 1)).toEqual([1]);
    expect(stationSystemsInRoom(ship, 0)).toEqual([2]);
  });

  it("places, turns and removes a station", () => {
    let ship = testShip([pilot, shields]);
    ship = placeStation(ship, 0, 3);
    expect(ship.blueprint.systems[0].slot).toEqual({ number: 3, direction: "right" });
    ship = placeStation(ship, 0, 2);
    expect(ship.blueprint.systems[0].slot).toEqual({ number: 2, direction: "left" });
    ship = placeStation(ship, 1, 1);
    expect(ship.blueprint.systems[1].slot).toEqual({ number: 1, direction: "right" });
    expect(stationOf(ship, 1)?.room.id).toBe(0);
    ship = setStationDirection(ship, 1, "up");
    expect(ship.blueprint.systems[1].slot!.direction).toBe("up");
    ship = removeStation(ship, 1);
    expect("slot" in ship.blueprint.systems[1]).toBe(false);
  });
});

describe("deleting", () => {
  it("removes stations, doors and rooms together", () => {
    const ship = testShip([pilot, shields]);
    expect(systemsInRooms(ship, [1, 2])).toEqual([0]);
    const next = deleteSelection(ship, {
      ...EMPTY_SELECTION,
      rooms: [2],
      doors: [0],
      stations: [0],
    });
    expect(next.layout.rooms).toHaveLength(2);
    expect(next.layout.doors.map((d) => [d.x, d.y])).toEqual([
      [0, 0],
      [2, 2],
    ]);
    expect("slot" in next.blueprint.systems[0]).toBe(false);
    const rooms = deleteSelection(ship, { ...EMPTY_SELECTION, rooms: [0, 1] });
    expect(rooms.layout.rooms).toEqual([{ id: 0, x: 4, y: 0, w: 1, h: 1 }]);
    expect(rooms.blueprint.systems).toEqual([]);
  });
});
