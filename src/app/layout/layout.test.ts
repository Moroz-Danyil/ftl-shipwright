import { describe, expect, it } from "vitest";
import { addDoor } from "../../core";
import { cellPx as at, medbay, pilot, shields, testShip } from "../../testing/layoutFixtures";
import { addDoorOnWall, doorAt, doorsOfRoom, isDoorWall, nearestWall } from "./doors";
import { deleteSelection, systemsInRooms } from "./remove";
import {
  addRoomChecked,
  changeRoom,
  doorsMovingWith,
  moveRooms,
  placementProblem,
  rectFromCells,
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

  it("refuses cells left of or above cell 0, overlaps and empty rooms", () => {
    expect(placementProblem(rooms, [{ x: 0, y: 1, w: 2, h: 1 }])).toBeUndefined();
    expect(placementProblem(rooms, [{ x: -1, y: 1, w: 1, h: 1 }])).toBe("belowZero");
    expect(placementProblem(rooms, [{ x: 0, y: -1, w: 1, h: 1 }])).toBe("belowZero");
    expect(placementProblem(rooms, [{ x: 1, y: 0, w: 2, h: 1 }])).toBe("overlap");
    expect(placementProblem(rooms, [{ x: 5, y: 5, w: 0, h: 1 }])).toBe("tooSmall");
    expect(placementProblem(rooms, [{ x: 1, y: 0, w: 2, h: 1 }], new Set([0, 1]))).toBeUndefined();
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

  it("refuses moves past cell 0 or onto other rooms, and leaves the ship alone", () => {
    const ship = testShip();
    expect(moveRooms(ship, [0], -1, 0)).toEqual({ problem: "belowZero" });
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
    expect(changeRoom(ship, 0, { x: -2 }).problem).toBe("belowZero");
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
    const next = deleteSelection(ship, { rooms: [2], doors: [0], stations: [0] });
    expect(next.layout.rooms).toHaveLength(2);
    expect(next.layout.doors.map((d) => [d.x, d.y])).toEqual([
      [0, 0],
      [2, 2],
    ]);
    expect("slot" in next.blueprint.systems[0]).toBe(false);
    const rooms = deleteSelection(ship, { rooms: [0, 1], doors: [], stations: [] });
    expect(rooms.layout.rooms).toEqual([{ id: 0, x: 4, y: 0, w: 1, h: 1 }]);
    expect(rooms.blueprint.systems).toEqual([]);
  });
});
