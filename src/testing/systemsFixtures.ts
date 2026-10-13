/**
 * Game data for the Systems tests: a few systems with titles and limits, an
 * artillery weapon and interior pictures of known sizes.
 */
import { createGameView, memorySource, type ShipSystem, type SystemCatalogEntry } from "../core";
import type { GameData } from "../app/store";
import { useEditor } from "../app/store";
import { openTestShip } from "./layoutFixtures";

/** The first 24 bytes of a PNG of this size: enough for the picture size to be read. */
export function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

const origin = { file: "data/blueprints.xml", fromMod: false };
const system = (
  name: string,
  title: string,
  maxPower: number,
  startPower = 1
): SystemCatalogEntry => ({
  name,
  title: { kind: "text", text: title },
  startPower,
  maxPower,
  ...origin,
});

export function systemsGame(): GameData {
  const files = memorySource({
    "img/ship/interior/room_shields.png": pngHeader(70, 35),
    "img/ship/interior/room_shields_3.png": pngHeader(70, 70),
    "img/ship/interior/room_cloaking.png": pngHeader(70, 35),
    "img/ship/interior/room_cloaking_2.png": pngHeader(70, 70),
    "img/ship/interior/room_cloaking_glow.png": pngHeader(70, 35),
    "img/ship/interior/room_pilot.png": pngHeader(70, 70),
    "img/effects/door_sheet.png": pngHeader(175, 175),
    "img/people/human_base.png": pngHeader(140, 70),
    ...Object.fromEntries(
      ["shields", "pilot", "oxygen", "cloaking", "medbay", "clonebay"].map((s) => [
        `img/icons/s_${s}_overlay.png`,
        pngHeader(32, 32),
      ])
    ),
  });
  const view = createGameView(files);
  return {
    datPath: "games/ftl.dat",
    base: files,
    view,
    texts: { english: Object.create(null) },
    catalogs: {
      ships: [],
      weapons: [
        { name: "ARTILLERY_FED", ...origin },
        { name: "LASER_BURST_1", ...origin },
      ],
      drones: [],
      augments: [],
      races: [],
      systems: [
        system("shields", "Shields", 8, 2),
        system("pilot", "Piloting", 3),
        system("oxygen", "Oxygen", 3),
        system("cloaking", "Cloaking", 3),
        system("medbay", "Medbay", 3),
        system("clonebay", "Clone Bay", 3),
      ],
    },
    animations: {
      sheets: {
        human: { name: "human", path: "img/people/human_base.png", w: 140, h: 70, fw: 35, fh: 35 },
      },
      anims: {
        human_type_right: { name: "human_type_right", sheet: "human", length: 4, x: 0, y: 1 },
      },
      weaponAnims: {},
    },
  };
}

/** The Layout test ship open with the Systems game data loaded. */
export function openSystemsShip(systems: ShipSystem[] = []): GameData {
  openTestShip(systems);
  const data = systemsGame();
  const doc = useEditor.getState().doc!;
  const present = {
    ...doc.history.present,
    art: { ...doc.history.present.art, source: data.view },
  };
  useEditor.setState({
    game: { status: "ready", datPath: data.datPath, data },
    doc: { ...doc, history: { ...doc.history, present }, saved: present },
  });
  return data;
}
