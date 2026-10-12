import { unzipSync, zipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import { addRoom, decodeText, encodeText, memorySource, parseLayoutTxt } from "../core";
import { testShip } from "../testing/layoutFixtures";
import { miniGame } from "../core/testing/miniGame";
import { en } from "../text/en";
import { DAT_PATH, withMiniGame, withMiniShipOpen } from "../testing/editorFixtures";
import { createFakePlatform } from "../testing/fakePlatform";
import { loadGameData, loadGameIntoStore } from "./gameData";
import { readPictureFiles, saveShipMod } from "./saveMod";
import { createNewShip, newShipIds, openGameShip, openRecentShip, slugFromName } from "./ships";
import { currentShip, hasUnsavedChanges, resetEditorStore, useEditor } from "./store";

const state = () => useEditor.getState();

describe("loading the game data", () => {
  beforeEach(() => resetEditorStore());

  it("reads texts, catalogs and animations step by step", async () => {
    const platform = createFakePlatform({ [DAT_PATH]: miniGame() });
    const steps: string[] = [];
    const data = await loadGameData(platform, DAT_PATH, undefined, (s) => steps.push(s));
    expect(steps).toEqual(["archive", "texts", "catalogs", "animations"]);
    expect(data.catalogs.ships.map((s) => s.name)).toEqual(["PLAYER_SHIP_MINI"]);
    expect(data.catalogs.ships[0].displayName).toBe("The Mini");
    expect(data.animations.weaponAnims.gun_art).toBeDefined();
  });

  it("applies a mod from a .ftl file", async () => {
    const platform = createFakePlatform({ [DAT_PATH]: miniGame() });
    const mod = zipSync({
      "data/text_blueprints.xml.append": encodeText(
        '<FTL><text name="ship_MINI_name">Modded Mini</text></FTL>'
      ),
    });
    await platform.writeFile("mods/mini.ftl", mod);
    const ok = await loadGameIntoStore(platform, en, DAT_PATH, {
      kind: "zip",
      path: "mods/mini.ftl",
    });
    expect(ok).toBe(true);
    expect(state().game.data!.catalogs.ships[0].displayName).toBe("Modded Mini");
    expect(state().game.mod).toEqual({ kind: "zip", path: "mods/mini.ftl" });
  });

  it("reports an archive that cannot be read", async () => {
    const platform = createFakePlatform({});
    const ok = await loadGameIntoStore(platform, en, "missing/ftl.dat", undefined);
    expect(ok).toBe(false);
    expect(state().game.status).toBe("error");
    expect(state().game.error).toBe(en.gameData.error("Cannot open missing/ftl.dat"));
  });
});

describe("opening ships", () => {
  it("opens a game ship in place, unchanged and remembered in Recent", async () => {
    await withMiniGame();
    expect(await openGameShip(en, "PLAYER_SHIP_MINI")).toBe(true);
    const doc = state().doc!;
    expect(doc.history.present.blueprint.name).toBe("PLAYER_SHIP_MINI");
    expect(doc.pictures.paths.hull).toBe("img/ship/mini_base.png");
    expect(hasUnsavedChanges(state())).toBe(false);
    expect(state().recent[0]).toMatchObject({
      name: "The Mini",
      blueprint: "PLAYER_SHIP_MINI",
      origin: { kind: "game" },
    });
  });

  it("reports a ship that cannot be opened", async () => {
    await withMiniGame();
    expect(await openGameShip(en, "ENEMY_NO_LAYOUT")).toBe(false);
    expect(state().doc).toBeUndefined();
    expect(state().notice?.kind).toBe("error");
  });

  it("makes file-safe ids that no game ship uses", () => {
    expect(slugFromName("  My Kestrel!  ")).toBe("my_kestrel");
    expect(slugFromName("Éclair 2")).toBe("eclair_2");
    expect(slugFromName("???")).toBe("ship");
    const taken = [{ name: "MINI", layout: "mini_2", img: "other" }];
    expect(newShipIds("Mini", taken)).toEqual({ name: "MINI_3", layout: "mini_3", img: "mini_3" });
    expect(newShipIds("Fresh", taken)).toEqual({ name: "FRESH", layout: "fresh", img: "fresh" });
  });

  it("copies a game ship under a new name, keeping the original's pictures", async () => {
    await withMiniGame();
    expect(await createNewShip(en, { name: "Tiny", copyOf: "PLAYER_SHIP_MINI" })).toBe(true);
    const ship = currentShip(state())!;
    expect(ship.blueprint).toMatchObject({ name: "TINY", layout: "tiny", img: "tiny" });
    expect(ship.blueprint.texts.name).toEqual({ kind: "text", text: "Tiny" });
    expect(ship.blueprint.texts.class).toEqual({ kind: "id", id: "ship_MINI_class" });
    expect(ship.layout.rooms).toHaveLength(2);
    expect(state().doc!.pictures.paths.hull).toBe("img/ship/mini_base.png");
    expect(hasUnsavedChanges(state())).toBe(true);
  });

  it("starts an empty ship", async () => {
    await withMiniGame();
    expect(await createNewShip(en, { name: "Blank" })).toBe(true);
    const ship = currentShip(state())!;
    expect(ship.blueprint.name).toBe("BLANK");
    expect(ship.blueprint.health).toBe(30);
    expect(ship.layout.rooms).toEqual([]);
  });
});

describe("saving a mod", () => {
  it("writes a .ftl file, marks the ship saved and reopens it from Recent", async () => {
    const platform = await withMiniShipOpen();
    state().edit((s) => addRoom(s, { x: 4, y: 0, w: 1, h: 1 }));
    expect(await saveShipMod(platform, en, { kind: "ftl", path: "out/mini.ftl" })).toBe(true);
    expect(hasUnsavedChanges(state())).toBe(false);
    expect(state().doc!.saveTarget).toEqual({ kind: "ftl", path: "out/mini.ftl" });

    const files = unzipSync(platform.disk.get("out/mini.ftl")!);
    expect(Object.keys(files).sort()).toEqual([
      "data/blueprints.xml.append",
      "data/mini.txt",
      "data/mini.xml",
    ]);
    expect(parseLayoutTxt(decodeText(files["data/mini.txt"])).rooms).toHaveLength(3);
    expect(decodeText(files["data/mini.txt"])).toContain("\r\n");

    const recent = state().recent[0];
    expect(recent.origin).toEqual({ kind: "modFile", path: "out/mini.ftl" });
    state().closeDocument();
    expect(await openRecentShip(platform, en, recent)).toBe(true);
    expect(currentShip(state())!.layout.rooms).toHaveLength(3);
    expect(state().doc!.saveTarget).toEqual({ kind: "ftl", path: "out/mini.ftl" });
  });

  it("writes a copy's pictures under its own name", async () => {
    const platform = await withMiniGame();
    await createNewShip(en, { name: "Tiny", copyOf: "PLAYER_SHIP_MINI" });
    expect(await saveShipMod(platform, en, { kind: "ftl", path: "out/tiny.ftl" })).toBe(true);
    const files = Object.keys(unzipSync(platform.disk.get("out/tiny.ftl")!));
    expect(files).toContain("img/ship/tiny_base.png");
    expect(files).toContain("img/ship/tiny_floor.png");
    expect(files).toContain("img/customizeUI/miniship_tiny.png");
    expect(files).not.toContain("img/ship/interior/room_pilot.png");
  });

  it("merges into a mod folder and creates its sub-folders", async () => {
    const platform = await withMiniShipOpen();
    await platform.writeFile(
      "mods/mine/data/blueprints.xml.append",
      encodeText('<shipBlueprint name="OTHER" layout="o" img="o"/>\n')
    );
    expect(await saveShipMod(platform, en, { kind: "folder", path: "mods/mine" })).toBe(true);
    const append = decodeText(platform.disk.get("mods/mine/data/blueprints.xml.append")!);
    expect(append).toContain('name="OTHER"');
    expect(append).toContain('name="PLAYER_SHIP_MINI"');
    expect(platform.disk.has("mods/mine/data/mini.txt")).toBe(true);
    expect(platform.folders).toContain("mods/mine/data");
    expect(state().recent[0].origin).toEqual({ kind: "modFolder", path: "mods/mine" });
  });

  it("refuses to save a ship without a hull picture", async () => {
    const platform = await withMiniGame();
    await createNewShip(en, { name: "Blank" });
    expect(await saveShipMod(platform, en, { kind: "ftl", path: "out/blank.ftl" })).toBe(false);
    expect(state().notice).toEqual({ kind: "error", text: en.save.needHull });
    expect(platform.disk.size).toBe(0);
  });

  it("reports a failed write", async () => {
    const platform = await withMiniShipOpen();
    platform.writeFile = async () => {
      throw "Access denied";
    };
    expect(await saveShipMod(platform, en, { kind: "ftl", path: "out/x.ftl" })).toBe(false);
    expect(state().notice).toEqual({ kind: "error", text: en.save.failed("Access denied") });
    expect(hasUnsavedChanges(state())).toBe(false);
  });
});

describe("picture files for saving", () => {
  it("include the interior pictures the ship's systems name", async () => {
    const source = memorySource({
      "img/ship/a_base.png": new Uint8Array([1]),
      "img/ship/interior/room_shields_3.png": new Uint8Array([2]),
    });
    const ship = testShip([{ system: "shields", power: 1, room: 0, img: "room_shields_3" }]);
    const files = await readPictureFiles(
      { source, paths: { hull: "img/ship/a_base.png", gibs: [], interiors: {} } },
      ship
    );
    expect(files?.interiors).toEqual({ room_shields_3: new Uint8Array([2]) });
  });
});
