import { describe, expect, it } from "vitest";
import { withMiniGame } from "../testing/editorFixtures";
import { shipFacts } from "./shipFacts";
import { useEditor } from "./store";

const game = () => useEditor.getState().game.data!;
const entry = (name: string) => game().catalogs.ships.find((s) => s.name === name)!;

describe("ship facts", () => {
  it("counts what a game ship starts with and finds its hull picture", async () => {
    await withMiniGame();
    expect(await shipFacts(game().view, entry("PLAYER_SHIP_MINI"))).toEqual({
      picture: "img/ship/mini_base.png",
      rooms: 2,
      systems: 2,
      weapons: 1,
      crew: 1,
      hull: 10,
    });
  });

  it("leaves out what the game data does not give", async () => {
    await withMiniGame();
    // No layout file, no picture and a blueprint without systems, weapons, crew or hull.
    const bare = {
      ...entry("PLAYER_SHIP_MINI"),
      layout: "missing",
      img: "missing",
      xml: '<shipBlueprint name="BARE" layout="missing" img="missing"/>',
    };
    expect(await shipFacts(game().view, bare)).toEqual({
      picture: undefined,
      rooms: undefined,
      systems: 0,
      weapons: 0,
      crew: 0,
      hull: undefined,
    });
    // A blueprint that cannot be read gives none of its facts.
    expect(await shipFacts(game().view, { ...bare, xml: "<nothing/>" })).toEqual({});
  });
});
