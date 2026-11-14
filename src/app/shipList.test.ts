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
    expect(groups.player.map((s) => s.name)).toEqual(["PLAYER_SHIP_HARD"]);
    expect(groups.other.map((g) => [g.className, g.ships.map((s) => s.name)])).toEqual([
      ["Auto-Scout", ["AUTO_BASIC"]],
      ["Rebel Flagship", ["BOSS_1_EASY", "BOSS_1_NORMAL_DLC"]],
      ["Rebel Rigger", ["REBEL_FAT", "NAMED_ONE"]],
      [undefined, ["MYSTERY"]],
    ]);
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
    expect(found.player).toEqual([]);
    expect(found.other).toEqual([{ className: "Rebel Flagship", ships: [dlc] }]);
    expect(groupShips(ships, "nothing")).toEqual({ player: [], other: [] });
  });
});
