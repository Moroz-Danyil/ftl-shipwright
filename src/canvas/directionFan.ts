/**
 * The direction fan of the selected gib: a wedge from the gib's centre
 * between its direction min and max (0 pointing up, angles growing
 * clockwise, as the explosion preview turns them), with an arrow along each
 * edge from where the slowest to where the fastest piece would be at the end
 * of the preview at ×1. The handle at each arrow's tip turns that end of the
 * range. Everything here is in ship pixels.
 */
import type { Point, Range, Ship } from "../core";
import { previewDistance } from "../app/art/explosion";
import type { ShipArt } from "../app/art/model";
import { gibRectPx } from "./artHitTest";

export type FanEnd = "min" | "max";

/** The shortest the fan is drawn, in screen pixels, so that its handles can be reached. */
const MIN_FAN_SCREEN = 48;
/** How far from a handle a press still takes it, in screen pixels. */
export const FAN_HANDLE_REACH = 10;
/** The step Shift snaps the direction to, in degrees. */
export const DIRECTION_SNAP = 15;

export interface FanGeometry {
  centre: Point;
  /** Where the slowest and the fastest piece end up. */
  inner: number;
  outer: number;
  direction: Range;
}

/** The point at `radius` from `centre` in direction `degrees`. */
export function pointAt(centre: Point, degrees: number, radius: number): Point {
  const a = (degrees * Math.PI) / 180;
  return { x: centre.x + Math.sin(a) * radius, y: centre.y - Math.cos(a) * radius };
}

/** The direction from `centre` to `p`, in degrees in [0, 360). */
export function directionTo(centre: Point, p: Point): number {
  const degrees = (Math.atan2(p.x - centre.x, centre.y - p.y) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

export function fanGeometry(
  ship: Ship,
  art: ShipArt,
  index: number,
  direction: Range,
  scale: number
): FanGeometry | undefined {
  const gib = ship.layoutXml.gibs[index];
  if (!gib) return undefined;
  const r = gibRectPx(ship, art, index);
  const centre = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  const a = Math.abs(previewDistance(gib.velocity.min));
  const b = Math.abs(previewDistance(gib.velocity.max));
  const shortest = MIN_FAN_SCREEN / scale;
  const outer = Math.max(a, b);
  const grow = outer < shortest ? (outer > 0 ? shortest / outer : 0) : 1;
  return {
    centre,
    inner: Math.min(a, b) * grow,
    outer: outer < shortest ? shortest : outer,
    direction,
  };
}

/** The tip of an end's arrow, where its handle is. */
export function handlePoint(fan: FanGeometry, end: FanEnd): Point {
  return pointAt(fan.centre, fan.direction[end], fan.outer);
}

/** The handle under a ship pixel, if any; the max handle wins when both are there. */
export function fanHandleAt(fan: FanGeometry, p: Point, scale: number): FanEnd | undefined {
  const reach = FAN_HANDLE_REACH / scale;
  const distance = (end: FanEnd) => {
    const h = handlePoint(fan, end);
    return Math.hypot(p.x - h.x, p.y - h.y);
  };
  const max = distance("max");
  const min = distance("min");
  if (max <= reach && max <= min) return "max";
  if (min <= reach) return "min";
  return undefined;
}

/**
 * The direction an end takes when dragged to `p`: whole degrees (Shift: a
 * multiple of 15), and of the values that point there the one nearest
 * `previous`, so that a drag can sweep past 0 or 360 without a jump.
 */
export function draggedDirection(centre: Point, p: Point, previous: number, snap: boolean): number {
  const step = snap ? DIRECTION_SNAP : 1;
  const angle = Math.round(directionTo(centre, p) / step) * step;
  return angle + 360 * Math.round((previous - angle) / 360);
}

const f = (n: number) => Math.round(n * 100) / 100;

/** The arc from `from` to `to` degrees at `radius`, as path commands after a point at `from`. */
function arcTo(centre: Point, from: number, to: number, radius: number): string {
  const end = pointAt(centre, to, radius);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to >= from ? 1 : 0;
  return `A${f(radius)} ${f(radius)} 0 ${large} ${sweep} ${f(end.x)} ${f(end.y)}`;
}

const at = (p: Point) => `${f(p.x)} ${f(p.y)}`;

/** A full ring between two radii (a disc when the inner one is 0), for a range of 360° or more. */
function ring(centre: Point, inner: number, outer: number): string {
  const circle = (r: number) =>
    r <= 0
      ? ""
      : `M${f(centre.x)} ${f(centre.y - r)}A${f(r)} ${f(r)} 0 1 1 ${f(centre.x)} ${f(centre.y + r)}A${f(r)} ${f(r)} 0 1 1 ${f(centre.x)} ${f(centre.y - r)}Z`;
  return circle(outer) + circle(inner);
}

/**
 * The fan's area between two radii, swept from the min to the max direction
 * (backwards when max is below min, as the preview picks).
 */
export function fanPath(fan: FanGeometry, inner: number, outer: number): string {
  const { centre, direction } = fan;
  const { min, max } = direction;
  if (Math.abs(max - min) >= 360) return ring(centre, inner, outer);
  const start = pointAt(centre, min, outer);
  const back = pointAt(centre, max, inner);
  const close = inner > 0 ? `L${at(back)}${arcTo(centre, max, min, inner)}` : `L${at(centre)}`;
  return `M${at(start)}${arcTo(centre, min, max, outer)}${close}Z`;
}
