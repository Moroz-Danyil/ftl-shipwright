import { describe, expect, it } from "vitest";
import type { Ship, ShipLayout } from "./model";
import { createShip } from "./ship";
import {
  checkRoomIds,
  findAirlocksOnLargeRooms,
  findDoorRoomMismatches,
  findDoorsTouchingNoRoom,
  findOverlappingRooms,
  findStationsOutsideRooms,
  validateLayout,
  validateShip,
} from "./validation";

function layout(rooms: ShipLayout["rooms"], doors: ShipLayout["doors"] = []): ShipLayout {
  return { ellipse: { halfWidth: 0, halfHeight: 0, offsetX: 0, offsetY: 0 }, rooms, doors };
}

const GOOD = layout(
  [
    { id: 0, x: 0, y: 0, w: 2, h: 2 },
    { id: 1, x: 2, y: 0, w: 2, h: 1 },
  ],
  [
    { x: 2, y: 0, roomA: 1, roomB: 0, vertical: true },
    { x: 0, y: 2, roomA: 0, roomB: -1, vertical: false },
  ]
);

describe("validation", () => {
  it("reports nothing for a good layout", () => {
    expect(validateLayout(GOOD)).toEqual([]);
  });

  it("finds overlapping rooms", () => {
    const issues = findOverlappingRooms(
      layout([
        { id: 0, x: 0, y: 0, w: 2, h: 2 },
        { id: 1, x: 1, y: 1, w: 2, h: 1 },
        { id: 2, x: 2, y: 0, w: 1, h: 1 },
      ])
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "room-overlap", rooms: [0, 1] });
  });

  it("finds room ids that are not 0..n-1 and empty rooms", () => {
    const issues = checkRoomIds(
      layout([
        { id: 0, x: 0, y: 0, w: 1, h: 1 },
        { id: 2, x: 1, y: 0, w: 1, h: 1 },
        { id: 1, x: 2, y: 0, w: 0, h: 1 },
      ])
    );
    expect(issues.map((i) => i.code)).toEqual(["room-ids", "room-ids", "room-size"]);
  });

  it("finds doors that touch no room", () => {
    const l = layout(GOOD.rooms, [
      ...GOOD.doors,
      { x: 9, y: 9, roomA: 0, roomB: 1, vertical: false },
    ]);
    expect(findDoorsTouchingNoRoom(l)).toEqual([
      expect.objectContaining({ code: "door-no-room", door: 2 }),
    ]);
    // A door with no rooms is not reported again as a mismatch.
    expect(findDoorRoomMismatches(l)).toEqual([]);
  });

  it("finds doors whose ids disagree with the geometry", () => {
    const l = layout(GOOD.rooms, [
      { x: 2, y: 0, roomA: 0, roomB: 0, vertical: true },
      { x: 0, y: 2, roomA: -1, roomB: 0, vertical: false },
    ]);
    expect(findDoorRoomMismatches(l).map((i) => i.door)).toEqual([0, 1]);
  });

  it("finds airlocks on rooms bigger than 2×2", () => {
    const l = layout(
      [
        { id: 0, x: 0, y: 0, w: 3, h: 2 },
        { id: 1, x: 3, y: 0, w: 2, h: 2 },
      ],
      [
        { x: 0, y: 0, roomA: 0, roomB: -1, vertical: true },
        { x: 5, y: 0, roomA: 1, roomB: -1, vertical: true },
        { x: 3, y: 0, roomA: 0, roomB: 1, vertical: true },
      ]
    );
    expect(findAirlocksOnLargeRooms(l)).toEqual([
      expect.objectContaining({ code: "airlock-large-room", door: 0, rooms: [0] }),
    ]);
  });

  it("finds stations outside their room and systems in missing rooms", () => {
    const base = createShip({ name: "A", layout: "a", img: "a" });
    const ship: Ship = {
      ...base,
      layout: GOOD,
      blueprint: {
        ...base.blueprint,
        systems: [
          { system: "pilot", power: 1, room: 1, slot: { number: 1, direction: "right" } },
          { system: "shields", power: 1, room: 1, slot: { number: 2 } },
          { system: "medbay", power: 1, room: 0, slot: { number: -2 } },
          { system: "engines", power: 1, room: 5 },
        ],
      },
    };
    const issues = findStationsOutsideRooms(ship.blueprint, ship.layout);
    expect(issues.map((i) => [i.code, i.system])).toEqual([
      ["station-outside-room", 1],
      ["system-unknown-room", 3],
    ]);
    expect(validateShip(ship)).toEqual(issues);
  });
});
