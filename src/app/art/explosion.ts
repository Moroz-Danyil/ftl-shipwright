/**
 * An approximate preview of the ship's explosion. Each gib leaves its place
 * at a speed within its velocity range, along a direction within its
 * direction range, turning by its angular range.
 *
 * To confirm in the game: the units. Here velocity is pixels per frame at 60
 * frames a second, direction is in degrees with 0 pointing up and angles
 * growing clockwise, and angular is degrees per frame.
 */
import type { Gib, Range } from "../../core";

export const EXPLOSION_SECONDS = 3;
const FRAMES_PER_SECOND = 60;

/** A repeatable number in [0, 1) for a gib and one of its values. */
function unit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const pick = (range: Range, r: number) => range.min + (range.max - range.min) * r;

export interface GibMotion {
  /** Offset from the gib's place, in pixels. */
  dx: number;
  dy: number;
  /** Turn in degrees, clockwise. */
  angle: number;
}

/** Where gib `index` is `seconds` after the explosion starts. */
export function gibMotionAt(gib: Gib, index: number, seconds: number): GibMotion {
  const speed = pick(gib.velocity, unit(index * 3 + 1)) * FRAMES_PER_SECOND;
  const direction = (pick(gib.direction, unit(index * 3 + 2)) * Math.PI) / 180;
  const spin = pick(gib.angular, unit(index * 3 + 3)) * FRAMES_PER_SECOND;
  const distance = speed * seconds;
  return {
    dx: Math.sin(direction) * distance,
    dy: -Math.cos(direction) * distance,
    angle: spin * seconds,
  };
}
