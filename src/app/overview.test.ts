import { describe, expect, it } from "vitest";
import { addDoor, addRoom, memorySource, updateBlueprint, type Catalogs } from "../core";
import { en } from "../text/en";
import { completeShip, fullArt } from "../testing/overviewFixtures";
import type { ShipArt } from "./art/model";
import { allChecks, type CheckCode } from "./checks";
import {
  ITEM_OF_CHECK,
  OVERVIEW_ITEMS,
  buildOverview,
  overviewCounts,
  type OverviewInput,
  type OverviewItem,
  type OverviewItemId,
} from "./overview";
import { EMPTY_SELECTION, selectionOf } from "./selection";

const origin = { file: "data/blueprints.xml", fromMod: false };
const data = {
  catalogs: {
    ships: [],
    weapons: [{ name: "GUN", ...origin }],
    drones: [{ name: "BOT", ...origin }],
    augments: [],
    races: [],
    systems: [],
  } as unknown as Catalogs,
  texts: { english: {} },
};

const overview = (input: Partial<OverviewInput> = {}) =>
  buildOverview({ ship: completeShip(), art: fullArt(), data, ...input }, en);

const items = (input: Partial<OverviewInput> = {}) => overview(input).flatMap((s) => s.items);

function item(id: OverviewItemId, input: Partial<OverviewInput> = {}): OverviewItem {
  return items(input).find((i) => i.id === id)!;
}

const notOk = (input: Partial<OverviewInput>) =>
  items(input)
    .filter((i) => i.status !== "ok")
    .map((i) => [i.id, i.status]);

describe("the ship overview", () => {
  it("is all ok for a complete ship, in the order of the workspaces", () => {
    const sections = overview();
    expect(sections.map((s) => [s.id, s.title])).toEqual([
      ["ship", "Ship"],
      ["rooms", "Rooms"],
      ["hull", "Hull"],
    ]);
    expect(sections.map((s) => s.items.map((i) => i.id))).toEqual([
      [...OVERVIEW_ITEMS.ship],
      [...OVERVIEW_ITEMS.rooms],
      [...OVERVIEW_ITEMS.hull],
    ]);
    for (const i of sections.flatMap((s) => s.items)) {
      expect(i.status, i.id).toBe("ok");
      expect(i.title).toBe(en.overview.items[i.id].title);
      expect(i.explanation).toBeUndefined();
      expect(i.details).toEqual([]);
    }
    expect(overviewCounts(sections)).toEqual({ problems: 0, checks: 0 });
  });

  it("shows short values for the items that are ok", () => {
    const values = Object.fromEntries(items().map((i) => [i.id, i.value]));
    expect(values).toMatchObject({
      name: "The T",
      class: "T Cruiser",
      description: "Written",
      saveName: "PLAYER_SHIP_T · Files will be named t",
      hullReactor: "30 hull, 8 reactor bars",
      crew: "3 of 8",
      slots: "Weapons 1/2, drones 0/2",
      knownItems: "All known",
      rooms: "Rooms: 4",
      doors: "Doors: 3",
      airlocks: "Airlocks: 2",
      onScreen: "Inside the frame",
      coreSystems: "Systems: 4",
      hull: "Set",
      floor: "Set",
      gibs: "Pieces: 1",
      mounts: "Mounts 2, weapon slots 2",
    });
    expect(values.overlap).toBeUndefined();
    const bare = { ...fullArt(), floor: undefined, cloak: undefined };
    expect(item("floor", { art: bare })).toMatchObject({ status: "ok", value: "None" });
    expect(item("cloak", { art: bare })).toMatchObject({ status: "ok", value: "None" });
  });

  it("puts every check in exactly one item of its own workspace", () => {
    const codes = Object.keys(ITEM_OF_CHECK) as CheckCode[];
    expect(codes).toHaveLength(30);
    for (const code of codes) {
      const sections = Object.entries(OVERVIEW_ITEMS).filter(([, ids]) =>
        (ids as readonly string[]).includes(ITEM_OF_CHECK[code])
      );
      expect(sections, code).toHaveLength(1);
    }

    // A ship with something wrong almost everywhere: no check may get lost.
    let ship = completeShip();
    ship = addRoom(ship, { x: 0, y: 0, w: 1, h: 1 });
    ship = addRoom(ship, { x: 30, y: 0, w: 1, h: 1 });
    ship = addDoor(ship, { x: 20, y: 9, vertical: true });
    ship = updateBlueprint(ship, {
      texts: {},
      health: 0,
      weaponSlots: 1,
      droneSlots: 0,
      weaponList: { items: ["GUN", "LASER_X"] },
      droneList: { items: ["DRONE_X"] },
      crew: [],
      systems: [
        { system: "shields", power: 2, room: 9 },
        { system: "medbay", power: 1, room: 1 },
        { system: "clonebay", power: 1, room: 1 },
        { system: "cloaking", power: 1, room: 0, img: "room_cloaking_3", start: false },
        { system: "pilot", power: 1, room: 2, slot: { number: 5 } },
      ],
    });
    ship = {
      ...ship,
      layoutXml: {
        ...ship.layoutXml,
        mounts: [{ x: 0, y: 0, rotate: false, mirror: false, gib: 7 }],
      },
    };
    const art: ShipArt = { source: memorySource({}), gibs: [null] };
    const sizes = { room_cloaking_3: { width: 35, height: 35 } };
    const input = { ship, art, data, sizes };
    const checks = allChecks(ship, sizes, art, data.catalogs, data.texts);
    const gathered = items(input).flatMap((i) => i.issues);
    const sorted = (list: object[]) => list.map((c) => JSON.stringify(c)).sort();
    expect(sorted(gathered)).toEqual(sorted(checks));
    expect(new Set(checks.map((c) => c.code)).size).toBeGreaterThan(20);
    for (const i of items(input))
      for (const issue of i.issues) expect(ITEM_OF_CHECK[issue.code]).toBe(i.id);
  });

  it("finds rooms crew cannot walk to; an airlock does not join them", () => {
    let ship = addRoom(completeShip(), { x: 5, y: 0, w: 1, h: 1 });
    ship = addDoor(ship, { x: 6, y: 0, vertical: true });
    const reach = item("reach", { ship });
    expect(reach).toMatchObject({ status: "check", workspace: "rooms" });
    expect(reach.explanation).toBe(en.overview.items.reach.explain);
    expect(reach.details).toEqual([{ text: "Crew cannot walk to room 4." }]);
    expect(reach.selection).toEqual(selectionOf({ kind: "room", id: 4 }));
    expect(item("reach", { ship: addDoor(ship, { x: 5, y: 0, vertical: true }) }).status).toBe(
      "ok"
    );
  });

  it("finds rooms outside the frame the game shows, on player ships only", () => {
    let ship = addRoom(completeShip(), { x: 17, y: 0, w: 2, h: 1 });
    ship = addRoom(ship, { x: 0, y: -2, w: 1, h: 1 });
    const onScreen = item("onScreen", { ship });
    expect(onScreen.status).toBe("check");
    expect(onScreen.details).toEqual([
      { text: "Outside the part of the screen the game shows: rooms 4 and 5." },
    ]);
    expect(onScreen.selection.rooms).toEqual([4, 5]);
    const enemy = updateBlueprint(ship, { name: "AUTO_T" });
    expect(item("onScreen", { ship: enemy })).toMatchObject({
      status: "ok",
      value: "Only for player ships",
    });
  });

  it("names the core systems the ship starts without", () => {
    const ship = completeShip();
    const systems = ship.blueprint.systems
      .filter((s) => s.system !== "engines")
      .map((s) => (s.system === "oxygen" ? { ...s, start: false } : s));
    const core = item("coreSystems", { ship: updateBlueprint(ship, { systems }) });
    expect(core.status).toBe("check");
    expect(core.details).toEqual([
      { text: "The ship starts without Engines.", systemId: "engines" },
      { text: "The ship starts without Oxygen.", systemId: "oxygen" },
    ]);
    expect(core.selection).toEqual(EMPTY_SELECTION);
  });

  it("marks what keeps the game from working as problems, the rest as worth a look", () => {
    expect(
      notOk({
        ship: { ...completeShip(), layout: { ...completeShip().layout, rooms: [], doors: [] } },
      })
    ).toEqual([
      ["rooms", "problem"],
      ["systemRooms", "check"],
    ]);
    expect(notOk({ ship: updateBlueprint(completeShip(), { health: 0 }) })).toEqual([
      ["hullReactor", "problem"],
    ]);
    expect(notOk({ art: { ...fullArt(), hull: undefined } })).toEqual([["hull", "problem"]]);
    const cloak = updateBlueprint(completeShip(), {
      systems: [
        ...completeShip().blueprint.systems,
        { system: "cloaking", power: 1, room: 1, img: "c", start: false },
      ],
    });
    expect(notOk({ ship: cloak, sizes: { c: { width: 35, height: 35 } } })).toEqual([
      ["pairs", "check"],
      ["interiors", "problem"],
    ]);
    expect(
      notOk({
        ship: updateBlueprint(completeShip(), { texts: {}, crew: [] }),
        art: { ...fullArt(), shield: undefined, miniship: undefined },
      })
    ).toEqual([
      ["name", "check"],
      ["class", "check"],
      ["description", "check"],
      ["crew", "check"],
      ["shield", "check"],
      ["shipIcon", "check"],
    ]);
  });

  it("asks only player ships for a hangar name, description and ship icon", () => {
    const enemy = updateBlueprint(completeShip(), {
      name: "AUTO_T",
      texts: { class: { kind: "text", text: "Drone" } },
    });
    expect(notOk({ ship: enemy, art: { ...fullArt(), miniship: undefined } })).toEqual([]);
  });

  it("reads text ids through the game's texts", () => {
    const ship = updateBlueprint(completeShip(), {
      texts: { ...completeShip().blueprint.texts, name: { kind: "id", id: "ship_T_name" } },
    });
    expect(item("name", { ship }).status).toBe("check");
    const named = { ...data, texts: { english: { ship_T_name: "The Tee" } } };
    expect(item("name", { ship, data: named })).toMatchObject({ status: "ok", value: "The Tee" });
    expect(item("name", { ship, data: undefined }).status).toBe("ok");
  });

  it("gathers checks of one kind and selects what they are about", () => {
    let ship = addDoor(completeShip(), { x: 20, y: 9, vertical: true });
    ship = addDoor(ship, { x: 20, y: 7, vertical: true });
    const doors = item("doors", { ship });
    expect(doors.details.map((d) => d.text)).toEqual([
      "Door 5 touches no room.",
      "Door 6 touches no room.",
    ]);
    expect(doors.selection).toEqual(
      selectionOf({ kind: "door", index: 5 }, { kind: "door", index: 6 })
    );

    const armed = updateBlueprint(completeShip(), {
      weaponSlots: 1,
      weaponList: { items: ["GUN", "LASER_X"] },
    });
    expect(item("slots", { ship: armed })).toMatchObject({ status: "check", details: [] });
    expect(item("knownItems", { ship: armed })).toMatchObject({
      status: "check",
      details: [{ text: "The game has no weapon named LASER_X." }],
      workspace: "ship",
      selection: selectionOf({ kind: "weapon", index: 1 }),
    });

    const gibs = item("gibs", { art: { ...fullArt(), gibs: [null] } });
    expect(gibs).toMatchObject({ status: "check", workspace: "hull" });
    expect(gibs.details).toEqual([{ text: "Gib 1 has no picture." }]);
    const mounts = { ...completeShip(), layoutXml: { ...completeShip().layoutXml, mounts: [] } };
    expect(item("mounts", { ship: mounts }).status).toBe("check");
  });

  it("counts the problems and the items to check", () => {
    const sections = overview({
      ship: updateBlueprint(completeShip(), { health: 0, crew: [] }),
      art: { ...fullArt(), hull: undefined, shield: undefined },
    });
    expect(overviewCounts(sections)).toEqual({ problems: 2, checks: 2 });
  });
});
