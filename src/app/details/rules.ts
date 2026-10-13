/**
 * What the hangar shows (name, class, description), the save name, hull,
 * reactor and starting crew.
 */
import { updateBlueprint, type CrewCount, type Ship, type ShipTexts } from "../../core";

export const LIMITS = {
  hull: { min: 1, max: 100 },
  reactor: { min: 1, max: 25 },
  crew: 8,
} as const;

/** The hull a new ship starts with. */
export const NEW_SHIP_HULL = 30;

export type TextField = "name" | "class" | "desc";

/** Stores a text inline; an empty text removes it. */
export function setText(ship: Ship, field: TextField, text: string): Ship {
  const texts: ShipTexts = { ...ship.blueprint.texts };
  if (text.trim() === "") delete texts[field];
  else texts[field] = { kind: "text", text };
  return updateBlueprint(ship, { texts });
}

/** A blueprint name or file base name: letters, digits and underscores. */
export function isValidId(value: string): boolean {
  return /^[A-Za-z0-9_]+$/.test(value);
}

/**
 * Renames the ship: `name` is the blueprint name, `base` the file base name
 * of its layout and pictures. Returns `undefined` for an invalid name.
 */
export function rename(ship: Ship, ids: { name?: string; base?: string }): Ship | undefined {
  const name = ids.name ?? ship.blueprint.name;
  const base = ids.base ?? ship.blueprint.layout;
  if (!isValidId(name) || !isValidId(base)) return undefined;
  const bp = ship.blueprint;
  if (bp.name === name && bp.layout === base && bp.img === base) return ship;
  return updateBlueprint(ship, { name, layout: base, img: base });
}

export function setHull(ship: Ship, value: number): Ship {
  const health = Math.max(LIMITS.hull.min, Math.min(LIMITS.hull.max, Math.round(value)));
  return ship.blueprint.health === health ? ship : updateBlueprint(ship, { health });
}

export function setReactor(ship: Ship, value: number): Ship {
  const maxPower = Math.max(LIMITS.reactor.min, Math.min(LIMITS.reactor.max, Math.round(value)));
  return ship.blueprint.maxPower === maxPower ? ship : updateBlueprint(ship, { maxPower });
}

export function crewTotal(ship: Ship): number {
  return ship.blueprint.crew.reduce((n, c) => n + c.amount, 0);
}

/**
 * Sets how many crew of a race the ship starts with, keeping the total at
 * most eight; 0 removes the race.
 */
export function setCrew(ship: Ship, race: string, amount: number): Ship {
  const crew = ship.blueprint.crew;
  const index = crew.findIndex((c) => c.race === race);
  const others = crewTotal(ship) - (index === -1 ? 0 : crew[index].amount);
  const n = Math.max(0, Math.min(LIMITS.crew - others, Math.round(amount)));
  if (index === -1) {
    if (n === 0) return ship;
    const added: CrewCount = { amount: n, race };
    return updateBlueprint(ship, { crew: [...crew, added] });
  }
  if (n === crew[index].amount) return ship;
  const next =
    n === 0
      ? crew.filter((_, i) => i !== index)
      : crew.map((c, i) => (i === index ? { ...c, amount: n } : c));
  return updateBlueprint(ship, { crew: next });
}
