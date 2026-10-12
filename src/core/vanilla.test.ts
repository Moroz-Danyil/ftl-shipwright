/**
 * Tests against the vanilla game data: round trips over every ship and the
 * geometry rules checked against the game's pictures. Skipped when the game
 * data folder is not available (see `testing/gameData.ts`).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  findShipBlueprints,
  parseShipBlueprint,
  replaceShipBlueprint,
  writeShipBlueprint,
} from "./blueprint";
import {
  cloakPositionPx,
  doorMatchesGeometry,
  doorRooms,
  doorSides,
  floorPositionPx,
  hullRectPx,
  mountPositionPx,
  roomsBoundsPx,
} from "./geometry";
import { parseLayoutTxt, writeLayoutTxt } from "./layoutTxt";
import { parseLayoutXml, writeLayoutXml } from "./layoutXml";
import { addDoor, addRoom, loadShip, saveShip, updateSystem } from "./ship";
import {
  HAS_GAME_DATA,
  findShipPicture,
  readData,
  vanillaBlueprints,
  vanillaLayouts,
  vanillaShips,
} from "./testing/gameData";
import { decodePng, opaqueBounds, readPngSize, type PngImage } from "./testing/png";
import { validateShip } from "./validation";

const pictureCache = new Map<string, PngImage>();
function picture(path: string): PngImage {
  let img = pictureCache.get(path);
  if (!img) {
    img = decodePng(readFileSync(path));
    pictureCache.set(path, img);
  }
  return img;
}

describe.skipIf(!HAS_GAME_DATA)("vanilla data", () => {
  const ships = vanillaShips();
  const layouts = vanillaLayouts();

  it("finds every ship blueprint and its layout files", () => {
    // 136 <shipBlueprint> tags appear in the files; one (PLAYER_SHIP_ANAEROBIC_3) is inside a comment.
    expect(vanillaBlueprints()).toHaveLength(135);
    expect(ships).toHaveLength(135);
    expect(layouts).toHaveLength(69);
    expect(vanillaBlueprints().some((b) => b.name === "PLAYER_SHIP_ANAEROBIC_3")).toBe(false);
  });

  describe("round trip parse → write → parse", () => {
    it.each(ships.map((s) => [s.name, s] as const))("blueprint %s", (_name, loc) => {
      const model = parseShipBlueprint(loc.xml);
      const written = writeShipBlueprint(model);
      expect(parseShipBlueprint(written)).toStrictEqual(model);
      // Writing again gives the same text (the writer is deterministic).
      expect(writeShipBlueprint(parseShipBlueprint(written))).toBe(written);
    });

    it.each(layouts)("layout %s.txt", (name) => {
      const model = parseLayoutTxt(readData(`${name}.txt`));
      const written = writeLayoutTxt(model);
      expect(parseLayoutTxt(written)).toStrictEqual(model);
      // Vanilla files are already in the vanilla style: same tokens, only the line endings differ.
      expect(written.split(/\s+/)).toEqual(readData(`${name}.txt`).split(/\s+/));
    });

    it.each(layouts)("layout %s.xml", (name) => {
      const model = parseLayoutXml(readData(`${name}.xml`));
      const written = writeLayoutXml(model);
      expect(parseLayoutXml(written)).toStrictEqual(model);
      expect(writeLayoutXml(parseLayoutXml(written))).toBe(written);
    });

    it("whole ships through loadShip / saveShip, with CRLF line endings", () => {
      for (const loc of ships) {
        const ship = loadShip({
          blueprintXml: loc.xml,
          layoutTxt: readData(`${loc.layout}.txt`),
          layoutXml: readData(`${loc.layout}.xml`),
        });
        const files = saveShip(ship, { lineEnding: "\r\n" });
        expect(files.layoutTxt).toBe(writeLayoutTxt(ship.layout, { lineEnding: "\r\n" }));
        expect(loadShip(files)).toStrictEqual(ship);
      }
    });
  });

  it("loads, edits and saves the Kestrel", () => {
    const blueprintsFile = readData("blueprints.xml");
    const location = findShipBlueprints(blueprintsFile).find((b) => b.name === "PLAYER_SHIP_HARD")!;
    let ship = loadShip({
      blueprintXml: location.xml,
      layoutTxt: readData(`${location.layout}.txt`),
      layoutXml: readData(`${location.layout}.xml`),
    });
    ship = addRoom(ship, { x: 17, y: 2, w: 2, h: 1 });
    ship = addDoor(ship, { x: 17, y: 2, vertical: true });
    ship = updateSystem(ship, 0, { power: 2 });
    ship = { ...ship, blueprint: { ...ship.blueprint, health: 25 } };
    expect(validateShip(ship)).toEqual([]);
    expect(ship.layout.doors[ship.layout.doors.length - 1]).toMatchObject({ roomA: 0, roomB: 17 });

    const files = saveShip(ship, { lineEnding: "\r\n" });
    const newFile = replaceShipBlueprint(blueprintsFile, location, files.blueprintXml.trimEnd());
    const again = findShipBlueprints(newFile);
    expect(again).toHaveLength(findShipBlueprints(blueprintsFile).length);
    const reloaded = loadShip({
      ...files,
      blueprintXml: again.find((b) => b.name === "PLAYER_SHIP_HARD")!.xml,
    });
    expect(reloaded).toStrictEqual(ship);
  });

  describe("model contents match the spec counts", () => {
    it("reads every kind of field", () => {
      const all = ships.map((s) => parseShipBlueprint(s.xml));
      const systems = all.flatMap((b) => b.systems);
      expect(all.filter((b) => b.texts.class?.kind === "text")).toHaveLength(1);
      expect(all.filter((b) => b.extraAttributes?.NOLOC === "1")).toHaveLength(1);
      expect(systems.filter((s) => s.start === true).length).toBe(251);
      expect(systems.filter((s) => s.start === false).length).toBe(349);
      // Player ships write start on all systems but 3.
      const player = all.filter((b) => b.name.startsWith("PLAYER_SHIP")).flatMap((b) => b.systems);
      expect(player.length - player.filter((s) => s.start !== undefined).length).toBe(3);
      expect(systems.filter((s) => s.system === "artillery").every((s) => s.weapon)).toBe(true);
      expect(
        all.filter((b) => b.extraElements.some((e) => e.startsWith("<boardingAI"))).length
      ).toBe(76);
      expect(all.filter((b) => b.droneList?.extraAttributes?.missiles !== undefined).length).toBe(
        7
      );
      // Medbay and clonebay write only the station number.
      const medical = systems.filter(
        (s) => (s.system === "medbay" || s.system === "clonebay") && s.slot
      );
      expect(medical.length).toBe(37);
      expect(medical.every((s) => s.slot!.direction === undefined)).toBe(true);
      expect(
        systems.filter((s) => (s.slot?.number ?? 0) < 0).map((s) => [s.system, s.slot!.number])
      ).toEqual(new Array(6).fill(["medbay", -2]));
      expect(
        layouts.filter((name) => parseLayoutXml(readData(`${name}.xml`)).glowOffset).length
      ).toBe(41);
      expect(
        layouts.filter((name) => !parseLayoutXml(readData(`${name}.xml`)).cloakOffset)
      ).toEqual(["boss_2", "boss_2_easy", "boss_3", "boss_3_easy"]);
    });

    it("reads every door, room and mount", () => {
      let inner = 0;
      let reversed = 0;
      let airlocks = 0;
      let rooms = 0;
      let mounts = 0;
      let mountsWithoutSlide = 0;
      for (const name of layouts) {
        const layout = parseLayoutTxt(readData(`${name}.txt`));
        const xml = parseLayoutXml(readData(`${name}.xml`));
        rooms += layout.rooms.length;
        mounts += xml.mounts.length;
        mountsWithoutSlide += xml.mounts.filter((m) => m.slide === undefined).length;
        for (const d of layout.doors) {
          if (d.roomB === -1) airlocks++;
          else {
            inner++;
            if (d.roomA !== doorSides(layout, d)[0]) reversed++;
          }
        }
      }
      expect({ inner, reversed, airlocks }).toEqual({ inner: 910, reversed: 161, airlocks: 202 });
      expect(rooms).toBe(851);
      expect(mounts).toBe(325);
      expect(mountsWithoutSlide).toBe(8);
    });
  });

  describe("geometry against the room data", () => {
    it.each(layouts)("doors of %s connect the rooms written in the file", (name) => {
      const layout = parseLayoutTxt(readData(`${name}.txt`));
      for (const door of layout.doors) {
        expect(doorMatchesGeometry(layout, door), JSON.stringify(door)).toBe(true);
        const [a, b] = doorRooms(layout, door);
        if (door.roomB === -1) expect([a, b]).toEqual([door.roomA, -1]);
        else expect([a, b].sort()).toEqual([door.roomA, door.roomB].sort());
      }
    });

    it("vanilla ships pass validation", () => {
      for (const loc of ships) {
        const ship = loadShip({
          blueprintXml: loc.xml,
          layoutTxt: readData(`${loc.layout}.txt`),
          layoutXml: readData(`${loc.layout}.xml`),
        });
        expect(validateShip(ship), loc.name).toEqual([]);
      }
    });
  });

  describe("geometry against the pictures", () => {
    const loaded = ships.map((loc) => ({
      loc,
      blueprint: parseShipBlueprint(loc.xml),
      layout: parseLayoutTxt(readData(`${loc.layout}.txt`)),
      xml: parseLayoutXml(readData(`${loc.layout}.xml`)),
    }));

    it("the hull picture size equals <img w h> for every player-ship picture", () => {
      let checked = 0;
      for (const s of loaded) {
        const path = findShipPicture(`${s.blueprint.img}_base.png`);
        if (!path || !path.replace(/\\/g, "/").includes("/img/ship/")) continue;
        const size = readPngSize(readFileSync(path));
        expect({ w: size.width, h: size.height }, s.loc.name).toEqual({
          w: s.xml.img.w,
          h: s.xml.img.h,
        });
        checked++;
      }
      expect(checked).toBeGreaterThanOrEqual(28);
    });

    it("every mount lies on the hull picture", () => {
      let checked = 0;
      for (const s of loaded) {
        const path = findShipPicture(`${s.blueprint.img}_base.png`);
        if (!path) continue; // rebel_long_hard has no picture in the vanilla data
        const size = readPngSize(readFileSync(path));
        const hull = hullRectPx(s.layout, s.xml);
        for (const m of s.xml.mounts) {
          const p = mountPositionPx(s.layout, s.xml, m);
          expect(p.x, `${s.loc.name} mount ${m.x},${m.y}`).toBeGreaterThanOrEqual(hull.x);
          expect(p.y).toBeGreaterThanOrEqual(hull.y);
          expect(p.x).toBeLessThan(hull.x + size.width);
          expect(p.y).toBeLessThan(hull.y + size.height);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(600);
    });

    it("the floor picture extends about 6 px beyond the rooms", () => {
      const margins: Record<string, number[]> = {};
      for (const s of loaded) {
        if (!s.xml.floorOffset) continue;
        const path = findShipPicture(`${s.blueprint.floorImage ?? s.blueprint.img}_floor.png`);
        if (!path) continue;
        const floor = picture(path);
        const opaque = opaqueBounds(floor)!;
        const pos = floorPositionPx(s.layout, s.xml);
        const rooms = roomsBoundsPx(s.layout)!;
        margins[`${s.loc.layout}/${path}`] = [
          rooms.x - (pos.x + opaque.x),
          rooms.y - (pos.y + opaque.y),
          pos.x + opaque.x + opaque.w - (rooms.x + rooms.w),
          pos.y + opaque.y + opaque.h - (rooms.y + rooms.h),
        ];
      }
      const entries = Object.entries(margins);
      expect(entries.length).toBeGreaterThanOrEqual(20);
      let exact = 0;
      for (const [key, [left, top, right, bottom]] of entries) {
        if (key.startsWith("kestral/")) {
          // Known vanilla oddity: the Kestrel A floor picture stops 63 px short of
          // the right edge of its 3×2 cockpit room; the other three sides fit.
          expect([left, top, bottom]).toEqual([7, 7, 7]);
          expect(right).toBe(-63);
          continue;
        }
        for (const m of [left, top, right, bottom]) {
          expect(Math.abs(m - 6), `${key}: ${left} ${top} ${right} ${bottom}`).toBeLessThanOrEqual(
            2
          );
        }
        if (left === 6 && top === 6 && right === 6 && bottom === 6) exact++;
      }
      expect(exact).toBeGreaterThanOrEqual(16);
    });

    it("the cloak picture is centred on the hull", () => {
      let checked = 0;
      for (const s of loaded) {
        if (!s.xml.cloakOffset) continue;
        const hullPath = findShipPicture(`${s.blueprint.img}_base.png`);
        const cloakPath = findShipPicture(`${s.blueprint.cloakImage ?? s.blueprint.img}_cloak.png`);
        if (!hullPath || !cloakPath) continue;
        const hullBox = opaqueBounds(picture(hullPath))!;
        const cloakBox = opaqueBounds(picture(cloakPath))!;
        const hull = hullRectPx(s.layout, s.xml);
        const cloak = cloakPositionPx(s.layout, s.xml);
        const dx = cloak.x + cloakBox.x + cloakBox.w / 2 - (hull.x + hullBox.x + hullBox.w / 2);
        const dy = cloak.y + cloakBox.y + cloakBox.h / 2 - (hull.y + hullBox.y + hullBox.h / 2);
        expect(Math.abs(dx), s.loc.name).toBeLessThanOrEqual(4);
        expect(Math.abs(dy), s.loc.name).toBeLessThanOrEqual(4);
        checked++;
      }
      expect(checked).toBeGreaterThan(100);
    });

    it("the shield picture is 2·half-width × 2·half-height", () => {
      let checked = 0;
      for (const s of loaded) {
        const path = findShipPicture(`${s.blueprint.shieldImage ?? s.blueprint.img}_shields1.png`);
        if (!path) continue;
        const size = readPngSize(readFileSync(path));
        // Exact for most ships; Federation and Stealth pictures are 1-2 px larger.
        expect(
          Math.abs(size.width - 2 * s.layout.ellipse.halfWidth),
          s.loc.name
        ).toBeLessThanOrEqual(2);
        expect(
          Math.abs(size.height - 2 * s.layout.ellipse.halfHeight),
          s.loc.name
        ).toBeLessThanOrEqual(2);
        checked++;
      }
      expect(checked).toBeGreaterThanOrEqual(28);
    });

    it("the gibs placed at their x/y cover the hull picture", () => {
      let checked = 0;
      for (const s of loaded) {
        const hullPath = findShipPicture(`${s.blueprint.img}_base.png`);
        if (!hullPath || !hullPath.replace(/\\/g, "/").includes("/img/ship/")) continue;
        const hull = picture(hullPath);
        const covered = new Uint8Array(hull.width * hull.height);
        s.xml.gibs.forEach((gib, i) => {
          const gibPath = findShipPicture(`${s.blueprint.img}_gib${i + 1}.png`);
          expect(gibPath, `${s.loc.name} gib${i + 1}`).toBeDefined();
          const g = picture(gibPath!);
          for (let y = 0; y < g.height; y++) {
            for (let x = 0; x < g.width; x++) {
              if (g.data[(y * g.width + x) * 4 + 3] === 0) continue;
              const hx = x + gib.x;
              const hy = y + gib.y;
              if (hx >= 0 && hy >= 0 && hx < hull.width && hy < hull.height)
                covered[hy * hull.width + hx] = 1;
            }
          }
        });
        let opaque = 0;
        let hit = 0;
        for (let i = 0; i < covered.length; i++) {
          // Faint edge pixels (glow, anti-aliasing) are not required to be covered.
          if (hull.data[i * 4 + 3] > 50) {
            opaque++;
            hit += covered[i];
          }
        }
        expect(opaque - hit, s.loc.name).toBe(0);
        checked++;
      }
      expect(checked).toBeGreaterThanOrEqual(28);
    });
  });
});
