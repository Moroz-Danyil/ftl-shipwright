import { beforeEach, describe, expect, it } from "vitest";
import { en } from "../text/en";
import { createFakePlatform } from "../testing/fakePlatform";
import { openLoadoutShip } from "../testing/loadoutFixtures";
import { runCommand } from "./commands";
import {
  addLoadoutItem,
  addShipAugment,
  isGameShipInPlace,
  moveSlot,
  removeSelectedSlots,
  renameShip,
  setCrewAmount,
  setShipHull,
  setShipText,
  setSlotCount,
  setStartingMissiles,
} from "./loadoutActions";
import { selectionOf } from "./selection";
import { useEditor } from "./store";

const state = () => useEditor.getState();
const bp = () => state().doc!.history.present.ship.blueprint;
const steps = () => state().doc!.history.past.length;

describe("Loadout actions", () => {
  beforeEach(() => openLoadoutShip());

  it("add items to free slots and select them, one step each", () => {
    expect(addLoadoutItem("weapon", "MISSILES_1", en)).toBe(true);
    expect(bp().weaponList).toEqual({
      count: 2,
      missiles: 4,
      items: ["LASER_BURST_1", "MISSILES_1"],
    });
    expect(state().selection.weapons).toEqual([1]);
    expect(addLoadoutItem("weapon", "LASER_BURST_1", en)).toBe(false);
    expect(state().notice).toEqual({ kind: "info", text: en.loadout.full.weapon });
    expect(addLoadoutItem("drone", "COMBAT_1", en)).toBe(true);
    expect(steps()).toBe(2);
    state().undo();
    expect(bp().droneList).toBeUndefined();
  });

  it("reorder and remove the selected slots, also with Delete", () => {
    addLoadoutItem("weapon", "MISSILES_1", en);
    moveSlot("weapon", 1, -1);
    expect(bp().weaponList?.items).toEqual(["MISSILES_1", "LASER_BURST_1"]);
    expect(state().selection.weapons).toEqual([0]);
    state().setWorkspace("loadout");
    expect(runCommand("delete", { platform: createFakePlatform(), texts: en })).toBe(true);
    expect(bp().weaponList?.items).toEqual(["LASER_BURST_1"]);
    expect(removeSelectedSlots()).toBe(false);
    expect(steps()).toBe(3);
  });

  it("change counts and augments", () => {
    setSlotCount("weapon", 4);
    setStartingMissiles(10);
    expect(bp()).toMatchObject({ weaponSlots: 4, weaponList: { missiles: 10 } });
    expect(addShipAugment("SCRAP_COLLECTOR", en)).toBe(true);
    expect(addShipAugment("SCRAP_COLLECTOR", en)).toBe(false);
    expect(state().notice?.text).toBe(en.loadout.augmentProblems.duplicate);
    expect(addShipAugment("FTL_BOOSTER", en)).toBe(true);
    expect(addShipAugment("FTL_BOOSTER", en)).toBe(true);
    expect(addShipAugment("FTL_BOOSTER", en)).toBe(false);
    expect(state().notice?.text).toBe(en.loadout.augmentProblems.full);
    expect(steps()).toBe(5);
  });
});

describe("Hangar and crew actions", () => {
  it("store texts inline and change hull and crew, one step each", () => {
    openLoadoutShip();
    setShipText("name", "The T");
    setShipHull(150);
    setCrewAmount("engi", 3);
    expect(bp().texts.name).toEqual({ kind: "text", text: "The T" });
    expect(bp().health).toBe(100);
    expect(bp().crew).toEqual([
      { amount: 2, race: "human" },
      { amount: 3, race: "engi" },
    ]);
    expect(steps()).toBe(3);
  });

  it("ask before renaming a game ship edited in place", async () => {
    openLoadoutShip({ kind: "game" });
    expect(isGameShipInPlace()).toBe(true);
    const platform = createFakePlatform();
    platform.answers.confirm.push(false);
    expect(await renameShip(platform, en, { name: "MY_T" })).toBe(false);
    expect(bp().name).toBe("PLAYER_SHIP_T");
    platform.answers.confirm.push(true);
    expect(await renameShip(platform, en, { name: "MY_T", base: "my_t" })).toBe(true);
    expect(bp()).toMatchObject({ name: "MY_T", layout: "my_t", img: "my_t" });
    expect(platform.asked.map((a) => a.message)).toEqual([
      en.hangar.confirmRename,
      en.hangar.confirmRename,
    ]);
    expect(isGameShipInPlace()).toBe(false);
    expect(await renameShip(platform, en, { base: "my_t2" })).toBe(true);
    expect(platform.asked).toHaveLength(2);
  });

  it("rename a new ship without asking, refusing invalid names", async () => {
    openLoadoutShip();
    const platform = createFakePlatform();
    expect(await renameShip(platform, en, { name: "bad name" })).toBe(false);
    expect(state().notice?.text).toBe(en.hangar.invalidId);
    expect(await renameShip(platform, en, { name: "GOOD" })).toBe(true);
    expect(platform.asked).toEqual([]);
    state().select(selectionOf({ kind: "weapon", index: 0 }));
    expect(state().selection.weapons).toEqual([0]);
  });
});
