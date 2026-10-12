import { describe, expect, it } from "vitest";
import type { Ship } from "./model";
import {
  addDoor,
  addMount,
  addRoom,
  addSystem,
  createShip,
  loadShip,
  removeDoor,
  removeMount,
  removeRoom,
  removeSystem,
  saveShip,
  setAnchor,
  syncDoorRooms,
  updateBlueprint,
  updateDoor,
  updateMount,
  updateRoom,
  updateSystem,
} from "./ship";
import { validateShip } from "./validation";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

/** Three rooms in a row: 0 | 1 | 2, each 2×1, with doors between them and an airlock on room 2. */
function threeRooms(): Ship {
  let s = createShip({ name: "TEST", layout: "test", img: "test" });
  s = addRoom(s, { x: 0, y: 0, w: 2, h: 1 });
  s = addRoom(s, { x: 2, y: 0, w: 2, h: 1 });
  s = addRoom(s, { x: 4, y: 0, w: 2, h: 1 });
  s = addDoor(s, { x: 2, y: 0, vertical: true });
  s = addDoor(s, { x: 4, y: 0, vertical: true });
  s = addDoor(s, { x: 6, y: 0, vertical: true });
  s = addSystem(s, { system: "pilot", power: 1, room: 0, start: true });
  s = addSystem(s, { system: "shields", power: 2, room: 1, start: true });
  s = addSystem(s, { system: "engines", power: 2, room: 2, start: true });
  return deepFreeze(s);
}

describe("loadShip / saveShip", () => {
  it("reads the three files and writes them back", () => {
    const files = {
      blueprintXml:
        '<shipBlueprint name="A" layout="a" img="a"><systemList><pilot power="1" room="0" start="true"/></systemList><boardingAI>sabotage</boardingAI></shipBlueprint>',
      layoutTxt:
        "X_OFFSET 1 Y_OFFSET 1 VERTICAL 0 ELLIPSE 100 50 0 0 ROOM 0 0 0 2 1 DOOR 0 0 0 -1 1",
      layoutXml:
        '<FTL><img x="-10" y="-10" w="100" h="60"/><offsets><cloak x="0" y="0"/></offsets><weaponMounts/><explosion/></FTL>',
    };
    const ship = loadShip(files);
    expect(ship.blueprint.systems).toHaveLength(1);
    expect(ship.layout.rooms).toHaveLength(1);
    expect(ship.layoutXml.cloakOffset).toEqual({ x: 0, y: 0 });
    const saved = saveShip(ship);
    expect(saved.blueprintXml).toContain("<boardingAI>sabotage</boardingAI>");
    expect(saved.layoutTxt.startsWith("X_OFFSET\n1\nY_OFFSET\n1\nVERTICAL\n0\nELLIPSE\n")).toBe(
      true
    );
    expect(loadShip(saved)).toEqual(ship);
  });

  it("createShip gives a valid, empty ship that can be saved", () => {
    const ship = createShip({ name: "NEW", layout: "new", img: "new" });
    expect(validateShip(ship)).toEqual([]);
    expect(loadShip(saveShip(ship))).toEqual(ship);
  });
});

describe("immutable edits", () => {
  it("builds rooms with consecutive ids and doors with geometry ids", () => {
    const s = threeRooms();
    expect(s.layout.rooms.map((r) => r.id)).toEqual([0, 1, 2]);
    expect(s.layout.doors.map((d) => [d.roomA, d.roomB])).toEqual([
      [0, 1],
      [1, 2],
      [2, -1],
    ]);
    expect(validateShip(s)).toEqual([]);
  });

  it("never changes the input and shares untouched parts", () => {
    const s = threeRooms();
    const moved = updateRoom(s, 1, { y: 5 });
    expect(s.layout.rooms[1].y).toBe(0);
    expect(moved.layout.rooms[1]).toEqual({ id: 1, x: 2, y: 5, w: 2, h: 1 });
    expect(moved.blueprint).toBe(s.blueprint);
    expect(moved.layoutXml).toBe(s.layoutXml);
    expect(moved.layout.rooms[0]).toBe(s.layout.rooms[0]);
  });

  it("removeRoom renumbers rooms, doors and systems", () => {
    const s = removeRoom(threeRooms(), 1);
    expect(s.layout.rooms).toEqual([
      { id: 0, x: 0, y: 0, w: 2, h: 1 },
      { id: 1, x: 4, y: 0, w: 2, h: 1 },
    ]);
    expect(s.layout.doors).toEqual([{ x: 6, y: 0, roomA: 1, roomB: -1, vertical: true }]);
    expect(s.blueprint.systems.map((x) => [x.system, x.room])).toEqual([
      ["pilot", 0],
      ["engines", 1],
    ]);
    expect(validateShip(s)).toEqual([]);
  });

  it("syncDoorRooms fixes doors after rooms move and keeps matching ones", () => {
    const s = threeRooms();
    const moved = updateRoom(s, 2, { x: 10 });
    expect(validateShip(moved).map((i) => i.code)).toContain("door-no-room");
    const synced = syncDoorRooms(moved);
    expect(synced.layout.doors[0]).toBe(moved.layout.doors[0]);
    expect(synced.layout.doors[1]).toEqual({ x: 4, y: 0, roomA: 1, roomB: -1, vertical: true });
    expect(syncDoorRooms(s)).toBe(s);
  });

  it("updateDoor recomputes ids, removeDoor removes", () => {
    const s = threeRooms();
    const flipped = updateDoor(s, 0, { x: 0, y: 1, vertical: false });
    expect(flipped.layout.doors[0]).toEqual({ x: 0, y: 1, roomA: 0, roomB: -1, vertical: false });
    expect(removeDoor(s, 1).layout.doors).toHaveLength(2);
  });

  it("edits systems, mounts, the anchor and blueprint fields", () => {
    let s = threeRooms();
    s = updateSystem(s, 1, { power: 4, slot: { number: 1, direction: "up" } });
    expect(s.blueprint.systems[1]).toEqual({
      system: "shields",
      power: 4,
      room: 1,
      start: true,
      slot: { number: 1, direction: "up" },
    });
    s = removeSystem(s, 0);
    expect(s.blueprint.systems.map((x) => x.system)).toEqual(["shields", "engines"]);
    s = addMount(s, { x: 1, y: 2, rotate: true, mirror: false, gib: 1, slide: "up" });
    s = updateMount(s, 0, { slide: "down" });
    expect(s.layoutXml.mounts[0].slide).toBe("down");
    expect(removeMount(s, 0).layoutXml.mounts).toEqual([]);
    s = setAnchor(s, 3, 4);
    expect([s.layout.xOffset, s.layout.yOffset]).toEqual([3, 4]);
    s = updateBlueprint(s, { health: 20, texts: { name: { kind: "text", text: "Test" } } });
    expect(saveShip(s).blueprintXml).toContain("<name>Test</name>");
  });
});
