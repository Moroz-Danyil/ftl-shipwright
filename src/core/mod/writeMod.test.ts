import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { findShipBlueprints, parseShipBlueprint } from "../blueprint";
import { createGameView } from "../data/gameView";
import { loadShipFromGame } from "../data/loadShip";
import { decodeText, memorySource, zipSource } from "../data/sources";
import { miniGame } from "../testing/miniGame";
import {
  BLUEPRINT_APPEND_PATH,
  buildShipMod,
  buildShipModForFolder,
  mergeBlueprintAppend,
  shipPicturePaths,
  zipMod,
  type ShipPictureFiles,
} from "./writeMod";

const NEW =
  '<shipBlueprint name="A" layout="a" img="a">\n\t<health amount="5"/>\n</shipBlueprint>\n';

describe("mergeBlueprintAppend", () => {
  it("replaces a blueprint with the same name in place and keeps everything else", () => {
    const existing =
      '<!-- my mod -->\r\n<weaponBlueprint name="W"/>\r\n<shipBlueprint name="A" layout="old" img="old">\r\n</shipBlueprint>\r\n<shipBlueprint name="B" layout="b" img="b"/>\r\n';
    const merged = mergeBlueprintAppend(existing, NEW);
    expect(merged).toBe(
      existing.replace(
        '<shipBlueprint name="A" layout="old" img="old">\r\n</shipBlueprint>',
        NEW.trimEnd()
      )
    );
  });

  it("replaces the last of several definitions", () => {
    const existing =
      '<shipBlueprint name="A" layout="1" img="1"/>\n<shipBlueprint name="A" layout="2" img="2"/>\n';
    expect(mergeBlueprintAppend(existing, NEW)).toBe(
      `<shipBlueprint name="A" layout="1" img="1"/>\n${NEW}`
    );
  });

  it("adds a new blueprint at the end", () => {
    expect(mergeBlueprintAppend('<shipBlueprint name="B" layout="b" img="b"/>', NEW)).toBe(
      `<shipBlueprint name="B" layout="b" img="b"/>\n${NEW}`
    );
    expect(mergeBlueprintAppend("<x/>\r\n", NEW)).toBe(`<x/>\r\n${NEW.trimEnd()}\r\n`);
    expect(mergeBlueprintAppend("", NEW)).toBe(NEW);
  });

  it("adds inside a wrapping <FTL>", () => {
    expect(mergeBlueprintAppend("<FTL>\n<x/>\n</FTL>\n", NEW)).toBe(`<FTL>\n<x/>\n${NEW}</FTL>\n`);
  });

  it("does not touch a blueprint inside a mod: instruction", () => {
    const existing =
      '<mod:findName type="shipBlueprint" name="A"><shipBlueprint name="A" layout="x" img="x"/></mod:findName>\n';
    expect(mergeBlueprintAppend(existing, NEW)).toBe(existing + NEW);
  });
});

async function miniPictures(overrides: Partial<ShipPictureFiles> = {}): Promise<ShipPictureFiles> {
  return {
    hull: new Uint8Array([1]),
    floor: new Uint8Array([2]),
    gibs: [new Uint8Array([3]), new Uint8Array([33])],
    shield: new Uint8Array([4]),
    miniship: new Uint8Array([8]),
    interiors: { room_pilot: new Uint8Array([5]), room_shields_9: new Uint8Array([9]) },
    ...overrides,
  };
}

describe("buildShipMod", () => {
  it("writes the blueprint, layout files and pictures that differ from the game", async () => {
    const game = miniGame();
    const view = createGameView(game);
    const { ship } = (await loadShipFromGame(view, "PLAYER_SHIP_MINI"))!;
    const files = await buildShipMod({
      ship,
      pictures: await miniPictures({ cloak: new Uint8Array([7]) }),
      game,
    });
    expect(files.map((f) => f.path)).toEqual([
      "data/blueprints.xml.append",
      "data/mini.txt",
      "data/mini.xml",
      "img/ship/mini_cloak.png",
      "img/ship/mini_gib2.png",
      "img/ship/interior/room_shields_9.png",
    ]);
    expect(parseShipBlueprint(decodeText(files[0].bytes))).toStrictEqual(ship.blueprint);
  });

  it("writes every picture without a game to compare with, using the image-name overrides", async () => {
    const game = miniGame();
    const { ship } = (await loadShipFromGame(createGameView(game), "PLAYER_SHIP_MINI"))!;
    const renamed = {
      ...ship,
      blueprint: { ...ship.blueprint, floorImage: "f", cloakImage: "c", shieldImage: "s" },
    };
    const files = await buildShipMod({
      ship: renamed,
      pictures: await miniPictures({ cloak: new Uint8Array([7]) }),
      options: { lineEnding: "\r\n" },
    });
    expect(files.map((f) => f.path)).toEqual([
      "data/blueprints.xml.append",
      "data/mini.txt",
      "data/mini.xml",
      "img/ship/mini_base.png",
      "img/ship/f_floor.png",
      "img/ship/c_cloak.png",
      "img/ship/mini_gib1.png",
      "img/ship/mini_gib2.png",
      "img/ship/s_shields1.png",
      "img/customizeUI/miniship_mini.png",
      "img/ship/interior/room_pilot.png",
      "img/ship/interior/room_shields_9.png",
    ]);
    expect(decodeText(files[1].bytes)).toContain("\r\n");
    expect(shipPicturePaths(renamed).gib(3)).toBe("img/ship/mini_gib3.png");
  });

  it("merges into an existing append (folder save)", async () => {
    const game = miniGame();
    const { ship } = (await loadShipFromGame(createGameView(game), "PLAYER_SHIP_MINI"))!;
    const folder = memorySource({
      [BLUEPRINT_APPEND_PATH]:
        '<!-- keep -->\n<shipBlueprint name="OTHER" layout="o" img="o"/>\n<shipBlueprint name="PLAYER_SHIP_MINI" layout="old" img="old"/>\n',
    });
    const files = await buildShipModForFolder(
      { ship, pictures: await miniPictures(), game },
      folder
    );
    const text = decodeText(files[0].bytes);
    expect(
      text.startsWith(
        '<!-- keep -->\n<shipBlueprint name="OTHER" layout="o" img="o"/>\n<shipBlueprint name="PLAYER_SHIP_MINI" layout="mini"'
      )
    ).toBe(true);
    expect(findShipBlueprints(text).map((b) => b.name)).toEqual(["OTHER", "PLAYER_SHIP_MINI"]);
    const empty = await buildShipModForFolder(
      { ship, pictures: await miniPictures(), game },
      memorySource({})
    );
    expect(findShipBlueprints(decodeText(empty[0].bytes)).map((b) => b.name)).toEqual([
      "PLAYER_SHIP_MINI",
    ]);
  });
});

describe("zipMod", () => {
  it("zips the tree without a wrapping folder and reads back as a mod", async () => {
    const game = miniGame();
    const { ship } = (await loadShipFromGame(createGameView(game), "PLAYER_SHIP_MINI"))!;
    const changed = { ...ship, blueprint: { ...ship.blueprint, health: 25 } };
    const files = await buildShipMod({ ship: changed, pictures: await miniPictures(), game });
    const zip = zipMod(files);
    expect(Object.keys(unzipSync(zip)).sort()).toEqual(files.map((f) => f.path).sort());
    const loaded = (await loadShipFromGame(
      createGameView(game, zipSource(zip)),
      "PLAYER_SHIP_MINI"
    ))!;
    expect(loaded.ship).toStrictEqual(changed);
    expect(loaded.blueprintFromMod).toBe(true);
  });
});
