import { describe, expect, it } from "vitest";
import type { ShipCatalogEntry } from "../core";
import { groupShips, matchesShip, shipTitle } from "./shipList";

const origin = { file: "data/blueprints.xml", fromMod: false };
function ship(name: string, more: Partial<ShipCatalogEntry> = {}): ShipCatalogEntry {
  return {
    name,
    layout: name.toLowerCase(),
    img: name.toLowerCase(),
    isPlayer: name.startsWith("PLAYER_SHIP_"),
    displayName: name,
    xml: "",
    ...origin,
    ...more,
  };
}

const ships = [
  ship("PLAYER_SHIP_HARD", { displayName: "The Kestrel", className: "Kestrel Cruiser" }),
  ship("BOSS_1_EASY", { className: "Rebel Flagship" }),
  ship("REBEL_FAT", { className: "Rebel Rigger" }),
  ship("AUTO_BASIC", { className: "Auto-Scout" }),
  ship("BOSS_1_NORMAL_DLC", { className: "Rebel Flagship" }),
  ship("MYSTERY"),
  ship("NAMED_ONE", { displayName: "The Wanderer", className: "Rebel Rigger" }),
];

/** Player ships in the scattered order of the game's files. */
const players = [
  ship("PLAYER_SHIP_HARD_2", { displayName: "The Red-Tail", className: "Kestrel Cruiser" }),
  ship("PLAYER_SHIP_EASY", { displayName: "The Kestrel", className: "Kestrel Cruiser" }),
  ship("PLAYER_SHIP_CRYSTAL", { className: "Crystal Cruiser" }),
  ship("PLAYER_SHIP_FED_2", { className: "Federation Cruiser" }),
  ship("PLAYER_SHIP_HARD", { displayName: "The Kestrel", className: "Kestrel Cruiser" }),
  ship("PLAYER_SHIP_TUTORIAL", { className: "Kestrel Cruiser" }),
  ship("PLAYER_SHIP_CIRCLE_3", { className: "Engi Cruiser" }),
  ship("PLAYER_SHIP_FED", { className: "Federation Cruiser" }),
  ship("PLAYER_SHIP_HARD_3", { className: "Kestrel Cruiser" }),
  ship("PLAYER_SHIP_MOD_OWN", { className: "Mod Cruiser", fromMod: true }),
];

const slotNames = (groups: ReturnType<typeof groupShips>) =>
  groups.hangar.map((g) => [g.type, g.ships.map((s) => [s.ship.name, s.layout])]);

describe("the ship list", () => {
  it("titles a ship by its game name, else its class, else its blueprint name", () => {
    expect(ships.map(shipTitle)).toEqual([
      "The Kestrel",
      "Rebel Flagship",
      "Rebel Rigger",
      "Auto-Scout",
      "Rebel Flagship",
      "MYSTERY",
      "The Wanderer",
    ]);
  });

  it("puts player ships first and the others by class (alphabetical), the ships without one last", () => {
    const groups = groupShips(ships);
    expect(slotNames(groups)).toEqual([["kestrel", [["PLAYER_SHIP_HARD", 0]]]]);
    expect(groups.otherPlayer).toEqual([]);
    expect(groups.other.map((g) => [g.className, g.ships.map((s) => s.name)])).toEqual([
      ["Auto-Scout", ["AUTO_BASIC"]],
      ["Rebel Flagship", ["BOSS_1_EASY", "BOSS_1_NORMAL_DLC"]],
      ["Rebel Rigger", ["REBEL_FAT", "NAMED_ONE"]],
      [undefined, ["MYSTERY"]],
    ]);
  });

  it("lists the player ships as the hangar does: by type in its order, layouts A, B, C", () => {
    const groups = groupShips([...ships.slice(1), ...players]);
    expect(slotNames(groups)).toEqual([
      [
        "kestrel",
        [
          ["PLAYER_SHIP_HARD", 0],
          ["PLAYER_SHIP_HARD_2", 1],
          ["PLAYER_SHIP_HARD_3", 2],
        ],
      ],
      ["engi", [["PLAYER_SHIP_CIRCLE_3", 2]]],
      [
        "federation",
        [
          ["PLAYER_SHIP_FED", 0],
          ["PLAYER_SHIP_FED_2", 1],
        ],
      ],
      ["crystal", [["PLAYER_SHIP_CRYSTAL", 0]]],
    ]);
    // The easy and tutorial Kestrels and the mod's own ship take no slot: a group of their own.
    expect(groups.otherPlayer.map((s) => s.name)).toEqual([
      "PLAYER_SHIP_EASY",
      "PLAYER_SHIP_TUTORIAL",
      "PLAYER_SHIP_MOD_OWN",
    ]);
    expect(groups.other.flatMap((g) => g.ships).some((s) => s.isPlayer)).toBe(false);
  });

  it("puts a ship under a slot's name in that slot even when it is not marked a player ship", () => {
    const modded = ship("PLAYER_SHIP_ROCK_2", { isPlayer: false, className: "Rock Cruiser" });
    expect(slotNames(groupShips([modded]))).toEqual([["rock", [["PLAYER_SHIP_ROCK_2", 1]]]]);
    expect(groupShips([modded]).other).toEqual([]);
  });

  it("still finds ships by their blueprint name, class or name", () => {
    const dlc = ships.find((s) => s.name === "BOSS_1_NORMAL_DLC")!;
    expect(matchesShip(dlc, "normal_dlc")).toBe(true);
    expect(matchesShip(dlc, "flagship boss")).toBe(true);
    expect(
      matchesShip(
        ships.find((s) => s.name === "NAMED_ONE")!,
        "wanderer"
      )
    ).toBe(true);
    const found = groupShips(ships, "boss_1_n");
    expect(found.hangar).toEqual([]);
    expect(found.other).toEqual([{ className: "Rebel Flagship", ships: [dlc] }]);
    expect(groupShips(ships, "nothing")).toEqual({ hangar: [], otherPlayer: [], other: [] });
  });

  it("searches across the hangar's ships and the other player ships", () => {
    const found = groupShips([...ships.slice(1), ...players], "kestrel");
    expect(slotNames(found)).toEqual([
      [
        "kestrel",
        [
          ["PLAYER_SHIP_HARD", 0],
          ["PLAYER_SHIP_HARD_2", 1],
          ["PLAYER_SHIP_HARD_3", 2],
        ],
      ],
    ]);
    expect(found.otherPlayer.map((s) => s.name)).toEqual([
      "PLAYER_SHIP_EASY",
      "PLAYER_SHIP_TUTORIAL",
    ]);
    expect(slotNames(groupShips(players, "fed_2"))).toEqual([
      ["federation", [["PLAYER_SHIP_FED_2", 1]]],
    ]);
  });
});
