/**
 * A ship the overview finds complete: the Rooms test ship with a fourth room
 * under room 0, the four core systems, texts, crew, a weapon, two mounts, a
 * gib and every picture.
 */
import {
  addDoor,
  addRoom,
  memorySource,
  updateBlueprint,
  type Mount,
  type Ship,
  type ShipSystem,
} from "../core";
import { NEW_GIB } from "../app/art/gibs";
import { gamePicture, type ShipArt } from "../app/art/model";
import { resetEditorStore, useEditor } from "../app/store";
import { testShip } from "./layoutFixtures";

const mount = (x: number): Mount => ({ x, y: 0, rotate: false, mirror: false, gib: 1 });

export function completeShip(): Ship {
  const systems: ShipSystem[] = [
    { system: "shields", power: 2, room: 0 },
    { system: "engines", power: 2, room: 1 },
    { system: "pilot", power: 1, room: 2, slot: { number: 0, direction: "right" } },
    { system: "oxygen", power: 1, room: 3 },
  ];
  let ship = testShip(systems);
  ship = addRoom(ship, { x: 0, y: 1, w: 2, h: 1 });
  ship = addDoor(ship, { x: 0, y: 1, vertical: false });
  ship = updateBlueprint(ship, {
    texts: {
      name: { kind: "text", text: "The T" },
      class: { kind: "text", text: "T Cruiser" },
      desc: { kind: "text", text: "A small ship." },
    },
    health: 30,
    maxPower: 8,
    weaponSlots: 2,
    droneSlots: 2,
    weaponList: { items: ["GUN"] },
    crew: [{ amount: 3, race: "human" }],
  });
  return {
    ...ship,
    layoutXml: { ...ship.layoutXml, mounts: [mount(0), mount(40)], gibs: [{ ...NEW_GIB }] },
  };
}

export function fullArt(): ShipArt {
  return {
    source: memorySource({}),
    hull: gamePicture("img/ship/t_base.png"),
    floor: gamePicture("img/ship/t_floor.png"),
    cloak: gamePicture("img/ship/t_cloak.png"),
    shield: gamePicture("img/ship/t_shields1.png"),
    miniship: gamePicture("img/customizeUI/miniship_t.png"),
    gibs: [gamePicture("img/ship/t_gib1.png")],
  };
}

/** A fresh store (without game data) with the complete ship open, or a changed copy of it. */
export function openCompleteShip(ship: Ship = completeShip(), art: ShipArt = fullArt()): void {
  resetEditorStore();
  useEditor.getState().openDocument({ ship, art, saved: true });
}
