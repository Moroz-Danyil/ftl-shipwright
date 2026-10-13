/**
 * Weapon mounts: points on the hull picture (hull pixels) where the n-th
 * equipped weapon is drawn. At most eight.
 */
import {
  addMount,
  removeMount,
  shipToHullPx,
  updateLayoutXml,
  updateMount,
  type Mount,
  type MountSlide,
  type Point,
  type Ship,
} from "../../core";

export const MAX_MOUNTS = 8;

export const SLIDES = ["up", "down", "left", "right", "no"] as const;

export type MountProblem = "full" | "outside";

/**
 * A new mount at a hull pixel. The game's player ships almost always turn a
 * mount in the top half of the hull up and mirror it, and one in the bottom
 * half down without mirroring; new mounts follow that.
 */
export function defaultMount(ship: Ship, hullPoint: Point): Mount {
  const top = hullPoint.y < ship.layoutXml.img.h / 2;
  return {
    x: Math.round(hullPoint.x),
    y: Math.round(hullPoint.y),
    rotate: true,
    mirror: top,
    gib: 0,
    slide: top ? "up" : "down",
  };
}

/** Adds a mount at a ship pixel; refused when there are eight or the point is off the hull picture. */
export function addMountAt(
  ship: Ship,
  shipPoint: Point
):
  { ship: Ship; index: number; problem?: undefined } | { ship?: undefined; problem: MountProblem } {
  if (ship.layoutXml.mounts.length >= MAX_MOUNTS) return { problem: "full" };
  const p = shipToHullPx(ship.layout, ship.layoutXml, shipPoint);
  const { w, h } = ship.layoutXml.img;
  if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) return { problem: "outside" };
  return { ship: addMount(ship, defaultMount(ship, p)), index: ship.layoutXml.mounts.length };
}

/** Swaps two mounts, so the weapons drawn on them swap too. */
export function swapMounts(ship: Ship, a: number, b: number): Ship {
  const mounts = [...ship.layoutXml.mounts];
  if (a === b || !mounts[a] || !mounts[b]) return ship;
  [mounts[a], mounts[b]] = [mounts[b], mounts[a]];
  return updateLayoutXml(ship, { mounts });
}

export function toggleRotate(ship: Ship, index: number): Ship {
  const m = ship.layoutXml.mounts[index];
  return m ? updateMount(ship, index, { rotate: !m.rotate }) : ship;
}

export function toggleMirror(ship: Ship, index: number): Ship {
  const m = ship.layoutXml.mounts[index];
  return m ? updateMount(ship, index, { mirror: !m.mirror }) : ship;
}

export function setSlide(ship: Ship, index: number, slide: MountSlide): Ship {
  const m = ship.layoutXml.mounts[index];
  return m && m.slide !== slide ? updateMount(ship, index, { slide }) : ship;
}

/** Links a mount to gib N (1-based), or to none (0). */
export function setMountGib(ship: Ship, index: number, gib: number): Ship {
  const m = ship.layoutXml.mounts[index];
  return m && m.gib !== gib ? updateMount(ship, index, { gib }) : ship;
}

export function setMountPosition(ship: Ship, index: number, x: number, y: number): Ship {
  const m = ship.layoutXml.mounts[index];
  return m && (m.x !== x || m.y !== y) ? updateMount(ship, index, { x, y }) : ship;
}

/** Moves mounts by whole hull pixels. */
export function moveMounts(ship: Ship, indices: number[], dx: number, dy: number): Ship {
  if (indices.length === 0 || (dx === 0 && dy === 0)) return ship;
  const mounts = ship.layoutXml.mounts.map((m, i) =>
    indices.includes(i) ? { ...m, x: m.x + dx, y: m.y + dy } : m
  );
  return updateLayoutXml(ship, { mounts });
}

/** Removes mounts by index. */
export function removeMounts(ship: Ship, indices: number[]): Ship {
  let next = ship;
  for (const i of [...indices].sort((a, b) => b - a)) next = removeMount(next, i);
  return next;
}
