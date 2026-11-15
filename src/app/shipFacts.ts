/**
 * A few facts about a game ship for a preview before it is copied: its
 * picture and how many rooms, systems, weapons, crew and hull points it
 * starts with. Read from the catalog's blueprint text and the layout file
 * alone, without loading the whole ship.
 */
import {
  findShipPicturePath,
  parseLayoutTxt,
  parseShipBlueprint,
  type GameView,
  type ShipBlueprint,
  type ShipCatalogEntry,
} from "../core";

/** The facts; a fact the game data does not give is absent. */
export interface ShipFacts {
  /** The hull picture (`<img>_base.png`), else the select icon, as a path in the game tree. */
  picture?: string;
  rooms?: number;
  /** The systems the ship starts with (not the ones to buy). */
  systems?: number;
  weapons?: number;
  crew?: number;
  hull?: number;
}

function blueprintOf(ship: ShipCatalogEntry): ShipBlueprint | undefined {
  try {
    return parseShipBlueprint(ship.xml);
  } catch {
    return undefined;
  }
}

async function roomCount(view: GameView, layout: string): Promise<number | undefined> {
  const text = await view.readText(`data/${layout}.txt`);
  if (text === undefined) return undefined;
  try {
    return parseLayoutTxt(text).rooms.length;
  } catch {
    return undefined;
  }
}

async function pictureOf(view: GameView, img: string): Promise<string | undefined> {
  const hull = await findShipPicturePath(view, `${img}_base.png`);
  if (hull) return hull;
  const miniship = `img/customizeUI/miniship_${img}.png`;
  return (await view.has(miniship)) ? miniship : undefined;
}

export async function shipFacts(view: GameView, ship: ShipCatalogEntry): Promise<ShipFacts> {
  const bp = blueprintOf(ship);
  const [picture, rooms] = await Promise.all([
    pictureOf(view, ship.img),
    roomCount(view, ship.layout),
  ]);
  return {
    picture,
    rooms,
    systems: bp?.systems.filter((s) => s.start !== false).length,
    weapons: bp?.weaponList?.items.length ?? (bp ? 0 : undefined),
    crew: bp?.crew.reduce((n, c) => n + c.amount, 0),
    hull: bp?.health,
  };
}
