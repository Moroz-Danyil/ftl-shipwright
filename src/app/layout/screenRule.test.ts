import { describe, expect, it } from "vitest";
import {
  addRoom,
  createShip,
  loadShip,
  normalizeRoomOrigin,
  saveShip,
  type Ship,
} from "../../core";
import { HAS_GAME_DATA, readData, vanillaShips } from "../../core/testing/gameData";
import { roomAreaCells } from "../../canvas/viewLimit";
import { layoutChecks, roomsOffScreen, roomsOutOfView } from "../checks";
import { addRoomChecked, moveRooms } from "./rooms";

/** A player ship with the given anchor and screen shift, and no rooms. */
function playerShip(x: number, y: number, horizontal?: number, vertical?: number): Ship {
  const ship = createShip({ name: "PLAYER_SHIP_T", layout: "t", img: "t" });
  return { ...ship, layout: { ...ship.layout, xOffset: x, yOffset: y, horizontal, vertical } };
}

describe("rooms and the game's screen", () => {
  it("never writes a negative offset for a ship whose rooms are inside the frame", () => {
    for (const x of [0, 1, 3])
      for (const y of [0, 2])
        for (const horizontal of [undefined, -40, -17, 0, 5, 18, 27, 40, 70])
          for (const vertical of [-40, -16, 0, 10, 35, 50]) {
            let ship = playerShip(x, y, horizontal, vertical);
            const area = roomAreaCells(ship.layout);
            // The top-left-most room the rules allow, and one in the bottom-right corner.
            const left = Math.ceil(area.left - 1e-6);
            const top = Math.ceil(area.top - 1e-6);
            ship = addRoomChecked(ship, { x: left, y: top, w: 2, h: 1 }).ship!;
            const right = Math.floor(area.right + 1e-6);
            const bottom = Math.floor(area.bottom + 1e-6);
            ship = addRoomChecked(ship, { x: right - 1, y: bottom - 1, w: 1, h: 1 }).ship!;
            expect(roomsOffScreen(ship)).toEqual([]);
            const written = loadShip(saveShip(ship)).layout;
            const label = `${x} ${y} ${horizontal} ${vertical}`;
            expect(written.xOffset, label).toBeGreaterThanOrEqual(0);
            expect(written.yOffset, label).toBeGreaterThanOrEqual(0);
          }
  });

  it("lets rooms go past the right and bottom edges, out of sight but saved at 0 or more", () => {
    let ship = playerShip(1, 2, undefined, -16);
    ship = addRoom(ship, { x: 0, y: 0, w: 2, h: 2 });
    ship = addRoomChecked(ship, { x: 25, y: 0, w: 2, h: 1 }).ship!;
    ship = addRoomChecked(ship, { x: 0, y: 20, w: 1, h: 2 }).ship!;
    expect(roomsOffScreen(ship)).toEqual([]);
    expect(roomsOutOfView(ship)).toEqual([1, 2]);
    expect(layoutChecks(ship)).toContainEqual({
      code: "rooms-out-of-view",
      rooms: [1, 2],
      workspace: "rooms",
    });
    const written = loadShip(saveShip(ship)).layout;
    expect([written.xOffset, written.yOffset]).toEqual([1, 2]);
  });

  it("reports rooms drawn above the frame as a problem: saved, they need a negative offset", () => {
    // A Kestrel-like layout: anchor (1, 2), VERTICAL -16, so the frame's top edge is row -1.54.
    let ship = playerShip(1, 2, undefined, -16);
    ship = addRoom(ship, { x: 0, y: 0, w: 2, h: 2 });
    expect(addRoomChecked(ship, { x: 3, y: -1, w: 1, h: 1 }).ship).toBeDefined();
    expect(addRoomChecked(ship, { x: 3, y: -3, w: 1, h: 2 }).problem).toBe("offScreen");
    expect(moveRooms(ship, [0], 0, -2).problem).toBe("offScreen");
    // A ship opened with such rooms (as the rules no longer let anyone draw them).
    const opened = addRoom(addRoom(ship, { x: 3, y: -2, w: 1, h: 2 }), { x: 3, y: -3, w: 1, h: 1 });
    expect(roomsOffScreen(opened)).toEqual([1, 2]);
    expect(layoutChecks(opened)).toContainEqual(
      expect.objectContaining({ code: "rooms-off-screen", severity: "problem", rooms: [1, 2] })
    );
    expect(normalizeRoomOrigin(opened).layout.yOffset).toBe(-1);
  });

  it.skipIf(!HAS_GAME_DATA)(
    "keeps every game player ship's rooms inside, and saves them at 0 or more",
    () => {
      const players = vanillaShips().filter((b) => b.name.startsWith("PLAYER_SHIP_"));
      expect(players.length).toBeGreaterThan(20);
      for (const b of players) {
        const ship = loadShip({
          blueprintXml: b.xml,
          layoutTxt: readData(`${b.layout}.txt`),
          layoutXml: readData(`${b.layout}.xml`),
        });
        expect(roomsOffScreen(ship), b.name).toEqual([]);
        const written = loadShip(saveShip(ship)).layout;
        expect(written.xOffset ?? 0, b.name).toBeGreaterThanOrEqual(0);
        expect(written.yOffset ?? 0, b.name).toBeGreaterThanOrEqual(0);
      }
    }
  );

  it.skipIf(!HAS_GAME_DATA)("refuses the Kestrel B's two rooms above the frame", () => {
    const b = vanillaShips().find((s) => s.name === "PLAYER_SHIP_HARD_2")!;
    const ship = loadShip({
      blueprintXml: b.xml,
      layoutTxt: readData(`${b.layout}.txt`),
      layoutXml: readData(`${b.layout}.xml`),
    });
    // Two rooms over the top rooms, three rows up: the place the game crashed with.
    const top = Math.min(...ship.layout.rooms.map((r) => r.y));
    const above = ship.layout.rooms.find((r) => r.y === top)!;
    expect(addRoomChecked(ship, { x: above.x, y: top - 3, w: 1, h: 2 }).problem).toBe("offScreen");
    let opened = addRoom(ship, { x: above.x, y: top - 2, w: 1, h: 2 });
    opened = addRoom(opened, { x: above.x, y: top - 3, w: 1, h: 1 });
    expect(roomsOffScreen(opened)).toHaveLength(2);
    expect(normalizeRoomOrigin(opened).layout.yOffset).toBeLessThan(0);
  });
});
