/**
 * Game data access against the vanilla files (as a folder source), the
 * optional real archive, a synthetic mod and the mod round trip.
 * Skipped when the game data folder is not available.
 */
import { existsSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { parseShipBlueprint } from "../blueprint";
import { parseLayoutTxt } from "../layoutTxt";
import { parseLayoutXml } from "../layoutXml";
import { buildShipMod, zipMod, type ShipPictureFiles } from "../mod/writeMod";
import { GAME_ROOT, HAS_GAME_DATA } from "../testing/gameData";
import { nodeDatAccess, nodeFolderAccess } from "../testing/nodeAccess";
import { readPngSize } from "../testing/png";
import {
  loadAnimations,
  raceWalkDownFrame,
  weaponRestingFrame,
  type Animations,
} from "./animations";
import { loadCatalogs, type Catalogs } from "./catalogs";
import { createGameView, type GameView } from "./gameView";
import { loadShipFromGame } from "./loadShip";
import { listInteriors, listMiniships, listShipPictures } from "./pictures";
import { datSource, folderSource, memorySource, zipSource, type FileSource } from "./sources";
import { loadTexts, lookupText, resolveText, type GameTexts } from "./texts";

// The real game archive, for an optional read-only test: set FTL_DAT_PATH to the game's ftl.dat.
const DAT_PATH = process.env.FTL_DAT_PATH ?? "";

describe.skipIf(!HAS_GAME_DATA)("vanilla game data", () => {
  let game: FileSource;
  let view: GameView;
  let texts: GameTexts;
  let catalogs: Catalogs;
  let animations: Animations;

  beforeAll(async () => {
    game = folderSource(GAME_ROOT, nodeFolderAccess);
    view = createGameView(game);
    texts = await loadTexts(view, "de");
    catalogs = await loadCatalogs(view, texts);
    animations = await loadAnimations(view);
  });

  it("reads the folder with forward slashes, case-insensitively", async () => {
    const list = await game.list();
    expect(list).toContain("data/blueprints.xml");
    expect(list.every((p) => !p.includes("\\"))).toBe(true);
    expect(await game.has("DATA\\Blueprints.XML")).toBe(true);
    expect((await game.readText("data/KESTRAL.txt"))?.startsWith("X_OFFSET")).toBe(true);
    expect(await game.readBytes("data/nope.xml")).toBeUndefined();
  });

  it("catalogs have the vanilla counts", () => {
    expect(catalogs.ships).toHaveLength(135);
    // The task says 31; the data has 30 usable PLAYER_SHIP_* blueprints (the 31st, PLAYER_SHIP_ANAEROBIC_3, is commented out).
    expect(catalogs.ships.filter((s) => s.isPlayer)).toHaveLength(30);
    expect(catalogs.ships.some((s) => s.name === "PLAYER_SHIP_TUTORIAL" && s.isPlayer)).toBe(true);
    expect(catalogs.weapons).toHaveLength(68);
    expect(catalogs.drones).toHaveLength(21);
    expect(catalogs.augments).toHaveLength(32);
    expect(catalogs.races).toHaveLength(10);
    expect(catalogs.systems).toHaveLength(16);
    expect(catalogs.ships.some((s) => s.fromMod)).toBe(false);
  });

  it("catalog entries hold the fields", () => {
    const kestrel = catalogs.ships.find((s) => s.name === "PLAYER_SHIP_HARD")!;
    expect(kestrel).toMatchObject({
      layout: "kestral",
      img: "kestral",
      isPlayer: true,
      file: "data/blueprints.xml",
      fromMod: false,
    });
    expect(kestrel.displayName.length).toBeGreaterThan(0);
    const burst = catalogs.weapons.find((w) => w.name === "LASER_BURST_1")!;
    expect(burst).toMatchObject({
      type: "LASER",
      damage: 1,
      shots: 1,
      sp: 0,
      fireChance: 1,
      breachChance: 0,
      cooldown: 10,
      power: 1,
      cost: 20,
      weaponArt: "laser_burst_1",
      iconImage: "laser",
    });
    expect(burst.title).toEqual({ kind: "id", id: "weapon_LASER_BURST_1_title" });
    const human = catalogs.races.find((r) => r.name === "human")!;
    expect(human.title).toEqual({ kind: "text", text: "Clone" });
    expect(human.powers).toEqual([{ kind: "id", id: "crew_human_power_1" }]);
    expect(catalogs.augments.find((a) => a.name === "SCRAP_COLLECTOR")).toMatchObject({
      cost: 50,
      stackable: true,
      value: 0.1,
    });
    expect(catalogs.systems.find((s) => s.name === "shields")).toMatchObject({
      type: "shields",
      startPower: 2,
      maxPower: 8,
      cost: 125,
    });
    expect(catalogs.drones.find((d) => d.name === "COMBAT_1")).toMatchObject({
      type: "COMBAT",
      power: 2,
      cost: 50,
      droneImage: "drone_combat",
      iconImage: "combat",
    });
    for (const w of catalogs.weapons) {
      for (const c of [w.fireChance, w.breachChance, w.stunChance])
        if (c !== undefined) expect(c >= 0 && c <= 10).toBe(true);
    }
  });

  it("only player ships have weapon slots", () => {
    for (const s of catalogs.ships)
      expect(parseShipBlueprint(s.xml).weaponSlots !== undefined, s.name).toBe(s.isPlayer);
  });

  it("English texts resolve for every player ship name and class; translations fall back to English", () => {
    const english: GameTexts = { english: texts.english };
    for (const s of catalogs.ships.filter((x) => x.isPlayer)) {
      expect(resolveText(english, s.nameText), `${s.name} name`).toBeTruthy();
      expect(resolveText(english, s.classText), `${s.name} class`).toBeTruthy();
    }
    expect(texts.language).toBe("de");
    const key = "weapon_LASER_BURST_1_title";
    expect(lookupText(texts, key)).not.toBe(lookupText(english, key));
    expect(lookupText({ ...texts, translation: {} }, key)).toBe(lookupText(english, key));
    expect(lookupText(texts, "no_such_key")).toBeUndefined();
    expect(lookupText(texts, "constructor")).toBeUndefined();
  });

  it("every weapon of a player ship loadout has a weapon anim whose sheet picture exists", async () => {
    let checked = 0;
    for (const s of catalogs.ships.filter((x) => x.isPlayer)) {
      for (const weaponName of parseShipBlueprint(s.xml).weaponList?.items ?? []) {
        const weapon = catalogs.weapons.find((w) => w.name === weaponName);
        expect(weapon, weaponName).toBeDefined();
        const frame = weaponRestingFrame(animations, weapon!.weaponArt!);
        expect(frame, weaponName).toBeDefined();
        expect(await view.has(frame!.path), frame!.path).toBe(true);
        const size = readPngSize((await view.readBytes(frame!.path))!);
        expect(frame!.rect.x + frame!.rect.w).toBeLessThanOrEqual(size.width);
        expect(frame!.rect.y).toBeGreaterThanOrEqual(0);
        expect(frame!.mountPoint).toBeDefined();
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });

  it("every race has a walk-down frame inside its sheet picture", async () => {
    for (const race of catalogs.races) {
      const frame = raceWalkDownFrame(animations, race.name);
      expect(frame, race.name).toBeDefined();
      const size = readPngSize((await view.readBytes(frame!.path))!);
      expect({ w: size.width, h: size.height }, race.name).toEqual({
        w: frame!.sheet.w,
        h: frame!.sheet.h,
      });
      const r = frame!.rect;
      expect(
        r.x >= 0 && r.y >= 0 && r.x + r.w <= size.width && r.y + r.h <= size.height,
        race.name
      ).toBe(true);
    }
    // Rows are counted from the bottom: the human walk-down row (y=12) is the top row of the 13-row sheet.
    expect(raceWalkDownFrame(animations, "human")!.rect).toEqual({ x: 0, y: 0, w: 35, h: 35 });
    // anaerobic is only in dlcAnimations.xml.
    expect(raceWalkDownFrame(animations, "anaerobic")).toBeDefined();
  });

  it("lists pictures", async () => {
    const interiors = await listInteriors(view);
    expect(interiors.some((i) => i.name === "room_shields_3")).toBe(true);
    expect(interiors.some((i) => /glow/i.test(i.name))).toBe(false);
    const ships = await listShipPictures(view);
    expect(ships.hull.filter((p) => p.path.startsWith("img/ship/"))).toHaveLength(28);
    expect(ships.hull.some((p) => p.path === "img/ships_glow/rebel_squat_base.png")).toBe(true);
    expect(ships.gib.find((p) => p.path === "img/ship/kestral_gib3.png")).toMatchObject({
      base: "kestral",
      gib: 3,
    });
    expect(ships.shield.some((p) => p.base === "kestral")).toBe(true);
    expect(await listMiniships(view)).toHaveLength(28);
  });

  it("loads a ship with its picture paths", async () => {
    const loaded = (await loadShipFromGame(view, "PLAYER_SHIP_HARD"))!;
    expect(loaded.ship.layout.rooms).toHaveLength(17);
    expect(loaded.pictures).toMatchObject({
      hull: "img/ship/kestral_base.png",
      floor: "img/ship/kestral_floor.png",
      cloak: "img/ship/kestral_cloak.png",
      shield: "img/ship/kestral_shields1.png",
      miniship: "img/customizeUI/miniship_kestral.png",
    });
    expect(loaded.pictures.gibs).toEqual(
      [1, 2, 3, 4, 5, 6].map((n) => `img/ship/kestral_gib${n}.png`)
    );
    expect(loaded.pictures.interiors.room_pilot).toBe("img/ship/interior/room_pilot.png");
    expect(loaded.blueprintFromMod).toBe(false);
    const enemy = (await loadShipFromGame(view, "REBEL_FAT"))!;
    expect(enemy.pictures.hull).toBe("img/ships_glow/rebel_squat_base.png");
    expect(await loadShipFromGame(view, "NO_SUCH_SHIP")).toBeUndefined();
  });

  it("a synthetic mod that adds a ship and overrides a weapon shows in the view and catalogs", async () => {
    const mod = memorySource({
      "data/blueprints.xml.append": `<shipBlueprint name="MY_SHIP" layout="my_ship" img="my_ship">
	<class>Test Cruiser</class>
	<name>My Ship</name>
	<systemList><pilot power="1" room="0" start="true"/></systemList>
	<weaponSlots>3</weaponSlots>
</shipBlueprint>
<weaponBlueprint name="LASER_BURST_1">
	<type>LASER</type>
	<title>Big Laser</title>
	<damage>5</damage>
	<weaponArt>laser_burst_1</weaponArt>
</weaponBlueprint>
<mod:findName type="weaponBlueprint" name="LASER_BURST_2"><mod:setValue>9</mod:setValue></mod:findName>`,
      "data/my_ship.txt":
        "X_OFFSET 1 Y_OFFSET 1 VERTICAL 0 ELLIPSE 100 50 0 0 ROOM 0 0 0 2 1 DOOR 0 0 0 -1 1",
      "data/my_ship.xml": '<FTL><img x="0" y="0" w="100" h="50"/><weaponMounts/><explosion/></FTL>',
      "img/ship/my_ship_base.png": new Uint8Array([1, 2, 3]),
    });
    const modded = createGameView(game, mod);
    const c = await loadCatalogs(modded, texts);
    expect(c.ships).toHaveLength(136);
    const mine = c.ships.find((s) => s.name === "MY_SHIP")!;
    expect(mine).toMatchObject({
      isPlayer: false,
      displayName: "My Ship",
      className: "Test Cruiser",
      fromMod: true,
      file: "data/blueprints.xml",
    });
    expect(c.weapons).toHaveLength(68);
    const laser = c.weapons.find((w) => w.name === "LASER_BURST_1")!;
    expect(laser).toMatchObject({
      damage: 5,
      fromMod: true,
      title: { kind: "text", text: "Big Laser" },
    });
    expect(laser.cost).toBeUndefined();
    expect(c.weapons.findIndex((w) => w.name === "LASER_BURST_1")).toBe(
      catalogs.weapons.findIndex((w) => w.name === "LASER_BURST_1")
    );
    expect(c.weapons.find((w) => w.name === "LASER_BURST_2")!.fromMod).toBe(false);

    expect(await modded.isFromMod("data/blueprints.xml")).toBe(true);
    expect(await modded.isFromMod("data/animations.xml")).toBe(false);
    const layers = (await modded.readLayers("data/blueprints.xml"))!;
    expect(layers.map((l) => [l.kind, l.fromMod])).toEqual([
      ["base", false],
      ["append", true],
    ]);
    const text = (await modded.readText("data/blueprints.xml"))!;
    expect(text.startsWith((await game.readText("data/blueprints.xml"))!)).toBe(true);
    expect(text.endsWith("</mod:findName>")).toBe(true);

    const loaded = (await loadShipFromGame(modded, "MY_SHIP"))!;
    expect(loaded.blueprintFromMod && loaded.layoutFromMod && loaded.layoutXmlFromMod).toBe(true);
    expect(loaded.pictures.hull).toBe("img/ship/my_ship_base.png");
    expect(loaded.pictures.floor).toBeUndefined();
    expect((await modded.list()).filter((p) => p.startsWith("data/my_ship"))).toHaveLength(2);
  });

  it("mod round trip: the Kestrel written to a zip and read back as a mod loads equal", async () => {
    const original = (await loadShipFromGame(view, "PLAYER_SHIP_HARD"))!;
    const read = async (p?: string | null) => (p ? (await view.readBytes(p))! : undefined);
    const pictures: ShipPictureFiles = {
      hull: (await read(original.pictures.hull))!,
      floor: await read(original.pictures.floor),
      cloak: await read(original.pictures.cloak),
      shield: await read(original.pictures.shield),
      miniship: await read(original.pictures.miniship),
      gibs: await Promise.all(original.pictures.gibs.map(async (g) => (await read(g))!)),
      interiors: Object.fromEntries(
        await Promise.all(
          Object.entries(original.pictures.interiors).map(
            async ([k, p]) => [k, (await read(p))!] as const
          )
        )
      ),
    };
    // Change one gib so that exactly one picture differs from the game's.
    const changedGib = new Uint8Array(pictures.gibs[1]);
    changedGib[changedGib.length - 1] ^= 0xff;
    pictures.gibs[1] = changedGib;

    const files = await buildShipMod({ ship: original.ship, pictures, game });
    expect(files.map((f) => f.path)).toEqual([
      "data/blueprints.xml.append",
      "data/kestral.txt",
      "data/kestral.xml",
      "img/ship/kestral_gib2.png",
    ]);

    const zip = zipMod(files);
    const mod = zipSource(zip);
    expect((await mod.list()).sort()).toEqual(files.map((f) => f.path).sort());
    const modded = createGameView(game, mod);
    const again = (await loadShipFromGame(modded, "PLAYER_SHIP_HARD"))!;
    expect(again.blueprintFromMod).toBe(true);
    expect(again.ship).toStrictEqual(original.ship);
    expect(again.pictures).toEqual(original.pictures);
    expect(await modded.readBytes("img/ship/kestral_gib2.png")).toEqual(changedGib);
    // The other definitions are still there; the mod's one wins.
    const c = await loadCatalogs(modded);
    expect(c.ships).toHaveLength(135);
    expect(c.ships.find((s) => s.name === "PLAYER_SHIP_HARD")!.fromMod).toBe(true);
    // Equal to what the core reads straight from the vanilla files.
    expect(again.ship.layout).toStrictEqual(
      parseLayoutTxt((await game.readText("data/kestral.txt"))!)
    );
    expect(again.ship.layoutXml).toStrictEqual(
      parseLayoutXml((await game.readText("data/kestral.xml"))!)
    );
  });
});

describe.skipIf(DAT_PATH === "" || !existsSync(DAT_PATH))(
  "the real game archive (read only)",
  () => {
    it("lists and reads data/blueprints.xml", async () => {
      const dat = datSource(DAT_PATH, nodeDatAccess());
      expect(await dat.has("data/blueprints.xml")).toBe(true);
      const text = (await dat.readText("data/blueprints.xml"))!;
      expect(text).toContain("<shipBlueprint");
      expect(await dat.has("img/ship/kestral_base.png")).toBe(true);
      expect(
        readPngSize((await dat.readBytes("img/ship/kestral_base.png"))!).width
      ).toBeGreaterThan(0);
    });
  }
);
