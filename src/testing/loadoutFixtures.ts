/**
 * Game data and a ship for the Loadout and Details tests: a few weapons,
 * drones (one of them a store item), augments and races with titles.
 */
import type { ShipText } from "../core";
import type { ShipOrigin } from "../app/settings";
import type { GameData } from "../app/store";
import { useEditor } from "../app/store";
import { openTestShip } from "./layoutFixtures";
import { systemsGame } from "./systemsFixtures";

const origin = { file: "data/blueprints.xml", fromMod: false };
const text = (t: string): ShipText => ({ kind: "text", text: t });

export function loadoutGame(): GameData {
  const game = systemsGame();
  return {
    ...game,
    catalogs: {
      ...game.catalogs,
      ships: [
        {
          name: "PLAYER_SHIP_T",
          layout: "t",
          img: "t",
          isPlayer: true,
          displayName: "T",
          xml: "",
          ...origin,
        },
      ],
      weapons: [
        {
          name: "LASER_BURST_1",
          title: text("Burst Laser I"),
          short: text("Burst I"),
          type: "BURST",
          damage: 1,
          shots: 2,
          power: 1,
          cooldown: 11,
          fireChance: 1,
          cost: 50,
          ...origin,
        },
        {
          name: "MISSILES_1",
          title: text("Artemis"),
          type: "MISSILES",
          damage: 2,
          missiles: 1,
          power: 1,
          ...origin,
        },
        { name: "ARTILLERY_FED", ...origin },
      ],
      drones: [
        { name: "COMBAT_1", title: text("Combat Drone I"), type: "COMBAT", power: 2, ...origin },
        { name: "REPAIR", title: text("System Repair Drone"), type: "REPAIR", power: 1, ...origin },
        { name: "ITEM_THING", title: text("A store item"), type: "ITEM_SOMETHING", ...origin },
      ],
      augments: [
        { name: "SCRAP_COLLECTOR", title: text("Scrap Recovery Arm"), cost: 50, ...origin },
        { name: "FTL_BOOSTER", title: text("FTL Booster"), stackable: true, ...origin },
      ],
      races: [
        { name: "human", title: text("Human"), powers: [], ...origin },
        {
          name: "engi",
          title: text("Engi"),
          desc: text("Exceptional engineers."),
          cost: 45,
          powers: [text("Repair speed is doubled"), text("Combat damage inflicted is halved")],
          ...origin,
        },
      ],
    },
  };
}

/** The test ship with two weapon slots (one filled), a drone slot and two humans, open with the game data. */
export function openLoadoutShip(shipOrigin?: ShipOrigin): void {
  const ship = openTestShip();
  const data = loadoutGame();
  useEditor.setState({ game: { status: "ready", datPath: data.datPath, data } });
  useEditor.getState().openDocument({
    ship: {
      ...ship,
      blueprint: {
        ...ship.blueprint,
        texts: { name: { kind: "id", id: "ship_T_name" } },
        weaponSlots: 2,
        droneSlots: 1,
        weaponList: { count: 1, missiles: 4, items: ["LASER_BURST_1"] },
        health: 30,
        maxPower: 8,
        crew: [{ amount: 2, race: "human" }],
      },
    },
    art: useEditor.getState().doc!.history.present.art,
    origin: shipOrigin,
    saved: true,
  });
}
