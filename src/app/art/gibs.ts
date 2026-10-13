/**
 * Explosion pieces (gibs): pictures placed on the hull (hull pixels) that fly
 * apart when the ship is destroyed. Gib N is `gibs[N - 1]`; mounts name the
 * gib they fly off with by its number.
 */
import { updateLayoutXml, type Gib, type Ship } from "../../core";
import type { PictureRef, ShipSnapshot } from "./model";

/** A new gib: at the hull's corner, with moderate motion. */
export const NEW_GIB: Gib = {
  velocity: { min: 0.2, max: 1 },
  direction: { min: 0, max: 360 },
  angular: { min: -0.5, max: 0.5 },
  x: 0,
  y: 0,
};

export function addGib(snapshot: ShipSnapshot, picture: PictureRef | null): ShipSnapshot {
  const gibs = [...snapshot.ship.layoutXml.gibs, NEW_GIB];
  const art = { ...snapshot.art, gibs: padded(snapshot, gibs.length - 1).concat(picture) };
  return { ship: updateLayoutXml(snapshot.ship, { gibs }), art };
}

/** The gib pictures, one per gib (missing ones `null`). */
function padded(snapshot: ShipSnapshot, length: number): Array<PictureRef | null> {
  const out = snapshot.art.gibs.slice(0, length);
  while (out.length < length) out.push(null);
  return out;
}

/**
 * Removes gibs by index. Mounts linked to a removed gib are linked to none;
 * links to later gibs follow their new numbers.
 */
export function removeGibs(snapshot: ShipSnapshot, indices: number[]): ShipSnapshot {
  if (indices.length === 0) return snapshot;
  const ship = snapshot.ship;
  const gone = new Set(indices);
  const count = ship.layoutXml.gibs.length;
  const renumber = new Map<number, number>();
  let next = 1;
  for (let i = 0; i < count; i++) if (!gone.has(i)) renumber.set(i + 1, next++);
  const mounts = ship.layoutXml.mounts.map((m) => {
    if (m.gib < 1 || m.gib > count) return m;
    const gib = renumber.get(m.gib) ?? 0;
    return gib === m.gib ? m : { ...m, gib };
  });
  const gibs = ship.layoutXml.gibs.filter((_, i) => !gone.has(i));
  const pictures = padded(snapshot, count).filter((_, i) => !gone.has(i));
  return {
    ship: updateLayoutXml(ship, { gibs, mounts }),
    art: { ...snapshot.art, gibs: pictures },
  };
}

export function updateGib(ship: Ship, index: number, patch: Partial<Gib>): Ship {
  const gib = ship.layoutXml.gibs[index];
  if (!gib) return ship;
  const gibs = ship.layoutXml.gibs.map((g, i) => (i === index ? { ...g, ...patch } : g));
  return updateLayoutXml(ship, { gibs });
}

export function moveGibs(ship: Ship, indices: number[], dx: number, dy: number): Ship {
  if (indices.length === 0 || (dx === 0 && dy === 0)) return ship;
  const gibs = ship.layoutXml.gibs.map((g, i) =>
    indices.includes(i) ? { ...g, x: g.x + dx, y: g.y + dy } : g
  );
  return updateLayoutXml(ship, { gibs });
}

export function setGibPicture(
  snapshot: ShipSnapshot,
  index: number,
  picture: PictureRef
): ShipSnapshot {
  const pictures = padded(snapshot, snapshot.ship.layoutXml.gibs.length);
  if (index >= pictures.length) return snapshot;
  pictures[index] = picture;
  return { ...snapshot, art: { ...snapshot.art, gibs: pictures } };
}
