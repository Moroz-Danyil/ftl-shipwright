/**
 * The app's services on the real game data (skipped unless FTL_DATA_ROOT,
 * and for the archive FTL_DAT_PATH, are set).
 */
import { unzipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { folderSource, validateShip } from "../core";
import { GAME_ROOT, HAS_GAME_DATA } from "../core/testing/gameData";
import { nodeDatAccess, nodeFolderAccess } from "../core/testing/nodeAccess";
import { en } from "../text/en";
import { createFakePlatform, type FakePlatform } from "../testing/fakePlatform";
import { loadGameData, loadGameIntoStore } from "./gameData";
import { buildOverview } from "./overview";
import { saveShipMod } from "./saveMod";
import { createNewShip, openGameShip } from "./ships";
import { resetEditorStore, useEditor } from "./store";
import { interiorPath, type PictureSize } from "./systems/interiors";
import { pngSize } from "../canvas/pictures";

const DAT_PATH = process.env.FTL_DAT_PATH ?? "";
const UNPACKED = "unpacked/ftl.dat";
const state = () => useEditor.getState();

describe.skipIf(!HAS_GAME_DATA)("the editor on the vanilla game", () => {
  let platform: FakePlatform;

  beforeAll(() => {
    platform = createFakePlatform({ [UNPACKED]: folderSource(GAME_ROOT, nodeFolderAccess) });
  });

  it("loads the game and opens the Kestrel with all its pictures", async () => {
    resetEditorStore();
    expect(await loadGameIntoStore(platform, en, UNPACKED, undefined)).toBe(true);
    const ships = state().game.data!.catalogs.ships;
    expect(ships).toHaveLength(135);
    expect(ships.filter((s) => s.isPlayer)).toHaveLength(30);

    expect(await openGameShip(en, "PLAYER_SHIP_HARD")).toBe(true);
    const doc = state().doc!;
    expect(state().recent[0].name).toBe("The Kestrel");
    expect(validateShip(doc.history.present.ship)).toEqual([]);
    const art = doc.history.present.art;
    expect([art.hull, art.floor, art.cloak, art.shield, art.miniship]).toEqual(
      [
        "img/ship/kestral_base.png",
        "img/ship/kestral_floor.png",
        "img/ship/kestral_cloak.png",
        "img/ship/kestral_shields1.png",
        "img/customizeUI/miniship_kestral.png",
      ].map((path) => ({ kind: "game", path }))
    );
    expect(art.gibs).toHaveLength(6);
  }, 60_000);

  it("saves the unchanged Kestrel without copying the game's pictures", async () => {
    expect(await saveShipMod(platform, en, { kind: "ftl", path: "out/kestrel.ftl" })).toBe(true);
    const files = Object.keys(unzipSync(platform.disk.get("out/kestrel.ftl")!)).sort();
    expect(files).toEqual(["data/blueprints.xml.append", "data/kestral.txt", "data/kestral.xml"]);
  });

  it("finds no problems in the overview of any player ship, and little to check", async () => {
    const data = state().game.data!;
    const problems: string[] = [];
    const toCheck: string[] = [];
    for (const entry of data.catalogs.ships.filter((s) => s.isPlayer)) {
      expect(await openGameShip(en, entry.name)).toBe(true);
      const { ship, art } = state().doc!.history.present;
      const sizes: Record<string, PictureSize> = {};
      for (const s of ship.blueprint.systems) {
        const bytes = s.img && (await art.source.readBytes(interiorPath(s.img)));
        const size = bytes && pngSize(bytes);
        if (s.img && size) sizes[s.img] = size;
      }
      for (const item of buildOverview({ ship, art, data, sizes }, en).flatMap((s) => s.items)) {
        if (item.status === "problem") problems.push(`${entry.name}: ${item.id}`);
        if (item.status === "check") toCheck.push(`${entry.name}: ${item.id}`);
      }
    }
    expect(problems).toEqual([]);
    // The stealth cruisers start without shields; the easy and tutorial Kestrels have no description.
    expect(toCheck.sort()).toEqual([
      "PLAYER_SHIP_EASY: description",
      "PLAYER_SHIP_STEALTH: coreSystems",
      "PLAYER_SHIP_STEALTH_2: coreSystems",
      "PLAYER_SHIP_STEALTH_3: coreSystems",
      "PLAYER_SHIP_TUTORIAL: description",
    ]);
  }, 120_000);

  it("saves a copy with the pictures under its own name", async () => {
    expect(await createNewShip(en, { name: "Red Kestrel", copyOf: "PLAYER_SHIP_HARD" })).toBe(true);
    expect(await saveShipMod(platform, en, { kind: "ftl", path: "out/red.ftl" })).toBe(true);
    const files = Object.keys(unzipSync(platform.disk.get("out/red.ftl")!));
    expect(files).toEqual(
      expect.arrayContaining([
        "data/red_kestrel.txt",
        "data/red_kestrel.xml",
        "img/ship/red_kestrel_base.png",
        "img/ship/red_kestrel_floor.png",
        "img/ship/red_kestrel_cloak.png",
        "img/ship/red_kestrel_shields1.png",
        "img/ship/red_kestrel_gib6.png",
        "img/customizeUI/miniship_red_kestrel.png",
      ])
    );
    expect(files.some((f) => f.startsWith("img/ship/interior/"))).toBe(false);
  });
});

describe.skipIf(!DAT_PATH)("the game archive", () => {
  it("loads the game data from ftl.dat", async () => {
    const platform = createFakePlatform();
    const archive = nodeDatAccess();
    platform.dat.listEntries = archive.listEntries;
    platform.dat.readEntry = archive.readEntry;
    const data = await loadGameData(platform, DAT_PATH, undefined);
    expect(data.catalogs.ships.length).toBeGreaterThan(100);
  }, 60_000);
});
