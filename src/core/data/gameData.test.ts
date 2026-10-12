/**
 * Texts, catalogs, animations, picture lists and ship loading on a tiny
 * synthetic game (no real game data needed).
 */
import { describe, expect, it } from "vitest";
import { MINI_LAYOUT_TXT, miniGame } from "../testing/miniGame";
import { parseLayoutTxt } from "../layoutTxt";
import {
  animFrame,
  loadAnimations,
  raceWalkDownFrame,
  sheetFrameRect,
  weaponRestingFrame,
} from "./animations";
import { latestDefinitions, loadCatalogs, readBlueprintElements } from "./catalogs";
import { createGameView } from "./gameView";
import { findShipPictures, loadShipFromGame } from "./loadShip";
import { findShipPicturePath, listInteriors, listMiniships, listShipPictures } from "./pictures";
import { memorySource } from "./sources";
import { loadTexts, lookupText, resolveText } from "./texts";

const view = createGameView(miniGame());

describe("texts", () => {
  it("loads English from every text_*.xml (later file wins) and a translation", async () => {
    const texts = await loadTexts(view, "de");
    expect(lookupText(texts, "weapon_GUN_title")).toBe("Gun (misc)");
    expect(lookupText(texts, "ship_MINI_name")).toBe("Das Mini");
    expect(lookupText(texts, "only_en")).toBe("English only");
    expect(lookupText(texts, "missing")).toBeUndefined();
    expect(resolveText(texts, { kind: "text", text: "Inline" })).toBe("Inline");
    expect(resolveText(texts, { kind: "id", id: "ship_MINI_class" })).toBe("Mini Cruiser");
    expect(resolveText(texts, undefined)).toBeUndefined();
  });

  it("has no translation for an unknown language", async () => {
    const texts = await loadTexts(view, "xx");
    expect(texts.translation).toBeUndefined();
    expect(texts.language).toBeUndefined();
    expect(lookupText(texts, "ship_MINI_name")).toBe("The Mini");
  });

  it("takes texts from a mod append", async () => {
    const modded = createGameView(
      miniGame(),
      memorySource({ "data/text_misc.xml.append": '<text name="only_en">Changed</text>' })
    );
    expect(lookupText(await loadTexts(modded), "only_en")).toBe("Changed");
  });
});

describe("catalogs", () => {
  it("lists usable ships and items; the later definition wins", async () => {
    const c = await loadCatalogs(view, await loadTexts(view));
    expect(c.ships.map((s) => s.name)).toEqual(["PLAYER_SHIP_MINI"]);
    expect(c.ships[0]).toMatchObject({
      layout: "mini",
      img: "mini",
      isPlayer: true,
      displayName: "The Mini",
      className: "Mini Cruiser",
      fromMod: false,
      file: "data/blueprints.xml",
    });
    expect(c.weapons).toEqual([
      {
        name: "GUN",
        type: "BEAM",
        damage: 2,
        weaponArt: "gun_art",
        file: "data/dlcBlueprints.xml",
        fromMod: false,
      },
    ]);
    // The drone's <weaponBlueprint> child is not a weapon definition.
    expect(c.drones).toEqual([
      {
        name: "BOT",
        type: "COMBAT",
        title: { kind: "text", text: "Bot" },
        power: 2,
        file: "data/blueprints.xml",
        fromMod: false,
      },
    ]);
    expect(c.augments).toEqual([
      {
        name: "AUG",
        title: { kind: "id", id: "aug_title" },
        cost: 30,
        stackable: false,
        value: 0.5,
        file: "data/blueprints.xml",
        fromMod: false,
      },
    ]);
    expect(c.races[0].powers).toEqual([
      { kind: "id", id: "p1" },
      { kind: "text", text: "Fast" },
    ]);
    expect(c.systems[0]).toMatchObject({ name: "shields", startPower: 2, maxPower: 8, cost: 125 });
  });

  it("without texts the display name is the blueprint name", async () => {
    const c = await loadCatalogs(view);
    expect(c.ships[0].displayName).toBe("PLAYER_SHIP_MINI");
    expect(c.ships[0].className).toBeUndefined();
  });

  it("latestDefinitions keeps the first position and the last definition", async () => {
    const defs = latestDefinitions(await readBlueprintElements(view), "weaponBlueprint");
    expect(defs).toHaveLength(1);
    expect(defs[0].file).toBe("data/dlcBlueprints.xml");
  });

  it("a ship becomes usable when the mod adds its layout files", async () => {
    const mod = memorySource({
      "data/missing.txt": MINI_LAYOUT_TXT,
      "data/missing.xml": '<img x="0" y="0" w="1" h="1"/>',
    });
    const c = await loadCatalogs(createGameView(miniGame(), mod));
    expect(c.ships.map((s) => [s.name, s.fromMod])).toEqual([
      ["PLAYER_SHIP_MINI", false],
      ["ENEMY_NO_LAYOUT", false],
    ]);
  });
});

describe("animations", () => {
  it("counts rows from the bottom of the sheet", () => {
    expect(sheetFrameRect({ h: 105, fw: 35, fh: 35 }, 0, 0)).toEqual({ x: 0, y: 70, w: 35, h: 35 });
    expect(sheetFrameRect({ h: 105, fw: 35, fh: 35 }, 1, 2)).toEqual({ x: 35, y: 0, w: 35, h: 35 });
  });

  it("reads sheets, anims and weapon anims from both files", async () => {
    const a = await loadAnimations(view);
    expect(a.sheets.gun_sheet).toEqual({
      name: "gun_sheet",
      path: "img/weapons/gun_strip.png",
      w: 60,
      h: 40,
      fw: 20,
      fh: 20,
    });
    expect(a.weaponAnims.gun_art).toEqual({
      name: "gun_art",
      sheet: "gun_sheet",
      length: 3,
      x: 0,
      y: 1,
      chargedFrame: 1,
      fireFrame: 2,
      firePoint: { x: 3, y: 4 },
      mountPoint: { x: 5, y: 6 },
    });
    expect(a.anims.human_walk_down.time).toBe(1);
    expect(a.anims.rock_walk_down).toBeDefined();
    expect(animFrame(a, a.weaponAnims.gun_art, 2)!.rect).toEqual({ x: 40, y: 0, w: 20, h: 20 });
  });

  it("gives the weapon resting frame and the race walk-down frame", async () => {
    const a = await loadAnimations(view);
    const gun = weaponRestingFrame(a, "gun_art")!;
    expect(gun.path).toBe("img/weapons/gun_strip.png");
    expect(gun.rect).toEqual({ x: 0, y: 0, w: 20, h: 20 });
    expect(gun.mountPoint).toEqual({ x: 5, y: 6 });
    expect(raceWalkDownFrame(a, "human")!.rect).toEqual({ x: 0, y: 0, w: 35, h: 35 });
    expect(raceWalkDownFrame(a, "rock")!.path).toBe("img/people/rock_base.png");
    expect(raceWalkDownFrame(a, "slug")).toBeUndefined();
    expect(weaponRestingFrame(a, "nothing")).toBeUndefined();
    expect(weaponRestingFrame(a, "constructor")).toBeUndefined();
  });
});

describe("picture lists", () => {
  it("lists interiors without glow overlays", async () => {
    expect(await listInteriors(view)).toEqual([
      { name: "room_pilot", path: "img/ship/interior/room_pilot.png" },
    ]);
  });

  it("lists ship pictures by kind", async () => {
    const p = await listShipPictures(view);
    expect(p.hull.map((x) => x.path)).toEqual([
      "img/ship/mini_base.png",
      "img/ships_glow/enemy_base.png",
    ]);
    expect(p.floor).toEqual([{ kind: "floor", base: "mini", path: "img/ship/mini_floor.png" }]);
    expect(p.shield.map((x) => x.base)).toEqual(["mini"]);
    expect(p.gib.map((x) => [x.base, x.gib])).toEqual([
      ["mini", 1],
      ["enemy", 2],
    ]);
    expect(p.cloak).toEqual([]);
  });

  it("lists miniships", async () => {
    expect(await listMiniships(view)).toEqual([
      { name: "mini", path: "img/customizeUI/miniship_mini.png" },
    ]);
    expect(await findShipPicturePath(view, "enemy_base.png")).toBe("img/ships_glow/enemy_base.png");
  });
});

describe("loadShipFromGame", () => {
  it("loads blueprint, layout files and existing picture paths", async () => {
    const loaded = (await loadShipFromGame(view, "PLAYER_SHIP_MINI"))!;
    expect(loaded.ship.layout).toStrictEqual(parseLayoutTxt(MINI_LAYOUT_TXT));
    expect(loaded.ship.blueprint.systems).toHaveLength(2);
    expect(loaded.pictures).toEqual({
      hull: "img/ship/mini_base.png",
      floor: "img/ship/mini_floor.png",
      shield: "img/ship/mini_shields1.png",
      miniship: "img/customizeUI/miniship_mini.png",
      gibs: ["img/ship/mini_gib1.png", null],
      interiors: { room_pilot: "img/ship/interior/room_pilot.png" },
    });
    expect(loaded).toMatchObject({
      file: "data/blueprints.xml",
      blueprintFromMod: false,
      layoutFromMod: false,
      layoutXmlFromMod: false,
    });
  });

  it("returns undefined for an unknown ship or missing layout files", async () => {
    expect(await loadShipFromGame(view, "NOPE")).toBeUndefined();
    expect(await loadShipFromGame(view, "ENEMY_NO_LAYOUT")).toBeUndefined();
    expect(await loadShipFromGame(view, "COMMENTED")).toBeUndefined();
  });

  it("uses floorImage / cloakImage / shieldImage names", async () => {
    const loaded = (await loadShipFromGame(view, "PLAYER_SHIP_MINI"))!;
    const ship = {
      ...loaded.ship,
      blueprint: { ...loaded.ship.blueprint, floorImage: "enemy", cloakImage: "mini" },
    };
    const modView = createGameView(
      miniGame(),
      memorySource({
        "img/ship/enemy_floor.png": new Uint8Array([1]),
        "img/ship/mini_cloak.png": new Uint8Array([1]),
      })
    );
    const pictures = await findShipPictures(modView, ship);
    expect(pictures.floor).toBe("img/ship/enemy_floor.png");
    expect(pictures.cloak).toBe("img/ship/mini_cloak.png");
  });
});
