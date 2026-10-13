/**
 * A small ship for the Layout tests, at anchor (1, 1):
 *   room 0: (0,0) 2x1, room 1: (2,0) 2x2, room 2: (4,0) 1x1
 * Doors: 0 between rooms 0 and 1, 1 between rooms 1 and 2,
 * 2 an airlock on the left of room 0, 3 an airlock below room 1.
 */
import { addDoor, addRoom, createShip, memorySource, type Ship, type ShipSystem } from "../core";
import { resetEditorStore, useEditor } from "../app/store";

export function testShip(systems: ShipSystem[] = []): Ship {
  let ship = createShip({ name: "PLAYER_SHIP_T", layout: "t", img: "t" });
  ship = { ...ship, layout: { ...ship.layout, xOffset: 1, yOffset: 1 } };
  ship = addRoom(ship, { x: 0, y: 0, w: 2, h: 1 });
  ship = addRoom(ship, { x: 2, y: 0, w: 2, h: 2 });
  ship = addRoom(ship, { x: 4, y: 0, w: 1, h: 1 });
  ship = addDoor(ship, { x: 2, y: 0, vertical: true });
  ship = addDoor(ship, { x: 4, y: 0, vertical: true });
  ship = addDoor(ship, { x: 0, y: 0, vertical: true });
  ship = addDoor(ship, { x: 2, y: 2, vertical: false });
  return { ...ship, blueprint: { ...ship.blueprint, systems } };
}

export const pilot: ShipSystem = {
  system: "pilot",
  power: 1,
  room: 1,
  slot: { number: 1, direction: "right" },
};
export const medbay: ShipSystem = { system: "medbay", power: 1, room: 1, slot: { number: 2 } };
export const shields: ShipSystem = { system: "shields", power: 2, room: 0 };

/** A fresh store with the test ship open (as saved). */
export function openTestShip(systems: ShipSystem[] = []): Ship {
  resetEditorStore();
  const ship = testShip(systems);
  useEditor.getState().openDocument({
    ship,
    art: { source: memorySource({}), gibs: [] },
    saved: true,
  });
  return ship;
}

/** The ship pixel at the given (fractional) cell of the test ship. */
export function cellPx(cx: number, cy: number) {
  return { x: (1 + cx) * 35, y: (1 + cy) * 35 };
}
