import { describe, expect, it } from "vitest";
import type { Animations } from "../core";
import { medbay, pilot, shields, testShip } from "../testing/layoutFixtures";
import {
  CLOSED_DOOR_FRAME,
  ROOM_ICON_SIZE,
  crewMembers,
  doorSpriteTransform,
  roomIcons,
  stationCrew,
  stationCrewFrame,
  systemIconPath,
} from "./gameLook";

describe("door sprites", () => {
  const layout = { xOffset: 1, yOffset: 1 };

  it("use the closed ordinary door: column 0, row 0", () => {
    expect(CLOSED_DOOR_FRAME).toEqual({ x: 0, y: 0, w: 35, h: 35 });
  });

  it("sit centred on a vertical wall, and turn 90° on a horizontal one", () => {
    // A vertical door on wall line x = 2, row 0: the segment runs from (105, 35) to (105, 70).
    expect(doorSpriteTransform(layout, { x: 2, y: 0, vertical: true })).toBe("translate(87.5 35)");
    // A horizontal door on wall line y = 1, column 0: from (35, 70) to (70, 70).
    expect(doorSpriteTransform(layout, { x: 0, y: 1, vertical: false })).toBe(
      "rotate(90 52.5 70) translate(35 52.5)"
    );
  });
});

describe("system icons in rooms", () => {
  const rect = { x: 100, y: 50, w: 70, h: 70 };

  it("use the game's overlay icon", () => {
    expect(systemIconPath("shields")).toBe("img/icons/s_shields_overlay.png");
  });

  it("are centred, normal when installed and marked when bought later", () => {
    const ship = testShip([shields, { ...pilot, start: false }]);
    expect(roomIcons(ship, 0, rect)).toEqual([{ system: "shields", later: false, x: 119, y: 69 }]);
    expect(roomIcons(ship, 1, rect)).toEqual([{ system: "pilot", later: true, x: 119, y: 69 }]);
    expect(roomIcons(ship, 2, rect)).toEqual([]);
  });

  it("stand side by side for two systems in one room", () => {
    const ship = testShip([medbay, { system: "clonebay", power: 1, room: 1, start: false }]);
    const icons = roomIcons(ship, 1, rect);
    expect(icons.map((i) => [i.system, i.later, i.x])).toEqual([
      ["medbay", false, 135 - ROOM_ICON_SIZE],
      ["clonebay", true, 135],
    ]);
  });
});

describe("crew at stations", () => {
  const sheet = { name: "s", path: "img/people/x.png", w: 140, h: 70, fw: 35, fh: 35 };
  const animations: Animations = {
    sheets: { human: { ...sheet, name: "human" }, engi: { ...sheet, name: "engi" } },
    anims: {
      human_type_up: { name: "human_type_up", sheet: "human", length: 4, x: 0, y: 1 },
      human_type_left: { name: "human_type_left", sheet: "human", length: 4, x: 0, y: 0 },
      human_walk_down: { name: "human_walk_down", sheet: "human", length: 4, x: 2, y: 0 },
      engi_type_up: { name: "engi_type_up", sheet: "engi", length: 4, x: 1, y: 1 },
    },
    weaponAnims: {},
  };

  it("use frame 0 of the manning animation facing the station's way", () => {
    expect(stationCrewFrame(animations, "human", "up")?.rect).toEqual({ x: 0, y: 0, w: 35, h: 35 });
    expect(stationCrewFrame(animations, "human", "left")?.rect).toEqual({
      x: 0,
      y: 35,
      w: 35,
      h: 35,
    });
    expect(stationCrewFrame(animations, "engi", "up")?.rect).toEqual({ x: 35, y: 0, w: 35, h: 35 });
  });

  it("stand when the station has no direction, and fall back to human", () => {
    expect(stationCrewFrame(animations, "human", undefined)?.rect).toEqual({
      x: 70,
      y: 35,
      w: 35,
      h: 35,
    });
    expect(stationCrewFrame(animations, "engi", "left")?.sheet.name).toBe("human");
    expect(stationCrewFrame(animations, "rock", "up")?.sheet.name).toBe("human");
    expect(stationCrewFrame({ ...animations, anims: {} }, "human", "up")).toBeUndefined();
  });
});

describe("who mans the stations", () => {
  // Three stations in the ship's systems order: shields (room 0), pilot and weapons (room 1).
  const ship = (crew: Array<{ amount: number; race: string }>) => {
    const base = testShip([
      { ...shields, slot: { number: 0, direction: "up" } },
      pilot,
      medbay,
      { system: "weapons", power: 1, room: 2, slot: { number: 0, direction: "down" } },
    ]);
    return { ...base, blueprint: { ...base.blueprint, crew } };
  };

  it("expand the crew list into members in its order", () => {
    expect(
      crewMembers(
        ship([
          { amount: 2, race: "human" },
          { amount: 1, race: "engi" },
        ])
      )
    ).toEqual(["human", "human", "engi"]);
    expect(crewMembers(ship([{ amount: 0, race: "rock" }]))).toEqual([]);
  });

  it("give the members to the stations in the ship's systems order", () => {
    expect(
      stationCrew(
        ship([
          { amount: 1, race: "engi" },
          { amount: 2, race: "human" },
        ])
      )
    ).toEqual([
      { system: 0, race: "engi" },
      { system: 1, race: "human" },
      { system: 3, race: "human" },
    ]);
  });

  it("leave stations empty when there are fewer members, or none", () => {
    expect(stationCrew(ship([{ amount: 1, race: "mantis" }]))).toEqual([
      { system: 0, race: "mantis" },
      { system: 1, race: null },
      { system: 3, race: null },
    ]);
    expect(stationCrew(ship([])).map((s) => s.race)).toEqual([null, null, null]);
  });

  it("leave members without a station when there are more of them", () => {
    const crewed = ship([
      { amount: 2, race: "human" },
      { amount: 4, race: "slug" },
    ]);
    expect(stationCrew(crewed).map((s) => s.race)).toEqual(["human", "human", "slug"]);
  });

  it("count only stations placed on a room", () => {
    const base = testShip([shields, pilot]);
    const crewed = {
      ...base,
      blueprint: { ...base.blueprint, crew: [{ amount: 2, race: "engi" }] },
    };
    expect(stationCrew(crewed)).toEqual([{ system: 1, race: "engi" }]);
  });
});
