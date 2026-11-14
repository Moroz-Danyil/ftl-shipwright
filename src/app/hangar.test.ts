import { describe, expect, it } from "vitest";
import { isPlayerShip } from "../canvas/viewLimit";
import {
  DEFAULT_SLOT,
  HANGAR_TYPES,
  clampSlot,
  hangarTypeName,
  isHangarSlot,
  layoutCount,
  slotImg,
  slotName,
  slotOf,
} from "./hangar";

const origin = { file: "data/blueprints.xml", fromMod: false };
const ship = (name: string, img: string, className?: string) => ({
  name,
  layout: img,
  img,
  isPlayer: true,
  displayName: name,
  xml: "",
  ...(className ? { className } : {}),
  ...origin,
});

describe("the hangar slots", () => {
  it("are the game's ten ship types with layouts A, B and C (the Lanius and Crystal A and B)", () => {
    expect(HANGAR_TYPES.map((t) => t.id)).toEqual([
      "kestrel",
      "engi",
      "federation",
      "zoltan",
      "mantis",
      "slug",
      "rock",
      "stealth",
      "lanius",
      "crystal",
    ]);
    expect(HANGAR_TYPES.flatMap((t) => t.layouts)).toHaveLength(28);
    expect(layoutCount("lanius")).toBe(2);
    expect(layoutCount("crystal")).toBe(2);
    expect(layoutCount("rock")).toBe(3);
    // Every slot is a player ship's name, so the player ship checks apply to it.
    expect(HANGAR_TYPES.flatMap((t) => t.layouts).every(isPlayerShip)).toBe(true);
  });

  it("turn blueprint names into slots and back", () => {
    expect(slotOf("PLAYER_SHIP_HARD")).toEqual({ type: "kestrel", layout: 0 });
    expect(slotOf("PLAYER_SHIP_JELLY_3")).toEqual({ type: "slug", layout: 2 });
    expect(slotOf("PLAYER_SHIP_ANAEROBIC_3")).toBeUndefined();
    expect(slotOf("PLAYER_SHIP_EASY")).toBeUndefined();
    expect(slotOf("BOSS_1")).toBeUndefined();
    expect(isHangarSlot("PLAYER_SHIP_CRYSTAL_2")).toBe(true);
    expect(isHangarSlot("NEW_SHIP")).toBe(false);
    expect(slotName({ type: "federation", layout: 1 })).toBe("PLAYER_SHIP_FED_2");
    expect(slotName(DEFAULT_SLOT)).toBe("PLAYER_SHIP_HARD");
    for (const type of HANGAR_TYPES)
      type.layouts.forEach((name, layout) =>
        expect(slotOf(name)).toEqual({ type: type.id, layout })
      );
  });

  it("keep the layout within the type's layouts", () => {
    expect(clampSlot({ type: "lanius", layout: 2 })).toEqual({ type: "lanius", layout: 1 });
    const slot = { type: "mantis" as const, layout: 2 };
    expect(clampSlot(slot)).toBe(slot);
    expect(slotName({ type: "crystal", layout: 2 })).toBe("PLAYER_SHIP_CRYSTAL_2");
  });

  it("name a type by the game's class of its layout A ship, and find the slot's picture", () => {
    const catalogs = {
      ships: [
        ship("PLAYER_SHIP_HARD", "kestral", "Kestrel Cruiser"),
        ship("PLAYER_SHIP_HARD_2", "kestral_2", "Kestrel Cruiser"),
      ],
    };
    expect(hangarTypeName(catalogs, "kestrel", "Kestrel")).toBe("Kestrel Cruiser");
    expect(hangarTypeName(catalogs, "engi", "Engi")).toBe("Engi");
    expect(hangarTypeName(undefined, "engi", "Engi")).toBe("Engi");
    expect(slotImg(catalogs, { type: "kestrel", layout: 1 })).toBe("kestral_2");
    expect(slotImg(catalogs, { type: "kestrel", layout: 2 })).toBeUndefined();
  });
});
