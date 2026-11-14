/**
 * The game's hangar slots. The hangar lists ten ship types, each with up to
 * three layouts (A, B and C), and shows a ship only when its blueprint name
 * is one of these slots. A mod's ship with a slot's name takes that slot's
 * place in the hangar.
 */
import type { Catalogs } from "../core";

/** The ship types of the hangar, in its order, with the blueprint names of layouts A, B and C. */
export const HANGAR_TYPES = [
  { id: "kestrel", layouts: ["PLAYER_SHIP_HARD", "PLAYER_SHIP_HARD_2", "PLAYER_SHIP_HARD_3"] },
  { id: "engi", layouts: ["PLAYER_SHIP_CIRCLE", "PLAYER_SHIP_CIRCLE_2", "PLAYER_SHIP_CIRCLE_3"] },
  { id: "federation", layouts: ["PLAYER_SHIP_FED", "PLAYER_SHIP_FED_2", "PLAYER_SHIP_FED_3"] },
  { id: "zoltan", layouts: ["PLAYER_SHIP_ENERGY", "PLAYER_SHIP_ENERGY_2", "PLAYER_SHIP_ENERGY_3"] },
  { id: "mantis", layouts: ["PLAYER_SHIP_MANTIS", "PLAYER_SHIP_MANTIS_2", "PLAYER_SHIP_MANTIS_3"] },
  { id: "slug", layouts: ["PLAYER_SHIP_JELLY", "PLAYER_SHIP_JELLY_2", "PLAYER_SHIP_JELLY_3"] },
  { id: "rock", layouts: ["PLAYER_SHIP_ROCK", "PLAYER_SHIP_ROCK_2", "PLAYER_SHIP_ROCK_3"] },
  {
    id: "stealth",
    layouts: ["PLAYER_SHIP_STEALTH", "PLAYER_SHIP_STEALTH_2", "PLAYER_SHIP_STEALTH_3"],
  },
  { id: "lanius", layouts: ["PLAYER_SHIP_ANAEROBIC", "PLAYER_SHIP_ANAEROBIC_2"] },
  { id: "crystal", layouts: ["PLAYER_SHIP_CRYSTAL", "PLAYER_SHIP_CRYSTAL_2"] },
] as const;

export type HangarTypeId = (typeof HANGAR_TYPES)[number]["id"];

/** A place in the hangar: a ship type and its layout (0 = A, 1 = B, 2 = C). */
export interface HangarSlot {
  type: HangarTypeId;
  layout: number;
}

/** The letters the hangar gives the layouts. */
export const LAYOUT_LETTERS = ["A", "B", "C"] as const;

/**
 * The slot a new ship takes unless another is chosen: the Kestrel's layout A,
 * the one ship every player has from the first run, so the new ship shows up
 * in the hangar at once without unlocking anything.
 */
export const DEFAULT_SLOT: HangarSlot = { type: "kestrel", layout: 0 };

function typeOf(id: HangarTypeId) {
  return HANGAR_TYPES.find((t) => t.id === id)!;
}

/** How many layouts a type has (2 or 3). */
export function layoutCount(type: HangarTypeId): number {
  return typeOf(type).layouts.length;
}

/** The slot with its layout kept within the type's layouts. */
export function clampSlot(slot: HangarSlot): HangarSlot {
  const layout = Math.max(0, Math.min(layoutCount(slot.type) - 1, slot.layout));
  return layout === slot.layout ? slot : { ...slot, layout };
}

/** The blueprint name of a slot, e.g. `PLAYER_SHIP_HARD_2` for the Kestrel's layout B. */
export function slotName(slot: HangarSlot): string {
  const { layouts } = typeOf(slot.type);
  return layouts[clampSlot(slot).layout];
}

/** The slot a blueprint name takes in the hangar, or `undefined` when it takes none. */
export function slotOf(blueprintName: string): HangarSlot | undefined {
  for (const type of HANGAR_TYPES) {
    const layout = (type.layouts as readonly string[]).indexOf(blueprintName);
    if (layout !== -1) return { type: type.id, layout };
  }
  return undefined;
}

/** True when a ship with this blueprint name shows in the game's hangar. */
export function isHangarSlot(blueprintName: string): boolean {
  return slotOf(blueprintName) !== undefined;
}

/**
 * The name of a ship type as the game's texts give it: the class of its
 * layout A ship (e.g. "Kestrel Cruiser"), else the fallback.
 */
export function hangarTypeName(
  catalogs: Pick<Catalogs, "ships"> | undefined,
  type: HangarTypeId,
  fallback: string
): string {
  const name = typeOf(type).layouts[0];
  return catalogs?.ships.find((s) => s.name === name)?.className || fallback;
}

/** The picture base name (`img`) of the game's ship in a slot, if the game has it. */
export function slotImg(
  catalogs: Pick<Catalogs, "ships"> | undefined,
  slot: HangarSlot
): string | undefined {
  const name = slotName(slot);
  return catalogs?.ships.find((s) => s.name === name)?.img;
}
