/**
 * An approximate preview of the ship's explosion. Each gib leaves its place
 * at a speed within its velocity range, along a direction within its
 * direction range, turning by its angular range.
 *
 * To confirm in the game: the units. Here direction is in degrees with 0
 * pointing up and angles growing clockwise; velocity and angular are taken
 * as pixels and degrees per step, at `STEPS_PER_SECOND` steps a second when
 * the preview plays at ×1. That pace is a guess: 60 steps a second (one per
 * frame) played clearly faster than the game, so ×1 is a third of it, and
 * the preview's speeds let the pace be matched to the game by eye.
 */
import type { Gib, Range } from "../../core";

/** How long the preview plays, in seconds on the clock, whatever its speed. */
export const EXPLOSION_SECONDS = 5;

/** The speeds the preview can play at; 1 is the pace described above. */
export const EXPLOSION_SPEEDS = [0.25, 0.5, 1, 2] as const;
export type ExplosionSpeed = (typeof EXPLOSION_SPEEDS)[number];

export const DEFAULT_EXPLOSION_SPEED: ExplosionSpeed = 1;

const STEPS_PER_SECOND = 20;

/** A repeatable number in [0, 1) for a gib and one of its values. */
function unit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const pick = (range: Range, r: number) => range.min + (range.max - range.min) * r;

/** How far a gib with this velocity flies during the preview at ×1, in pixels. */
export function previewDistance(velocity: number): number {
  return velocity * STEPS_PER_SECOND * EXPLOSION_SECONDS;
}

export interface GibMotion {
  /** Offset from the gib's place, in pixels. */
  dx: number;
  dy: number;
  /** Turn in degrees, clockwise. */
  angle: number;
}

/**
 * Where gib `index` is `seconds` into the explosion, counted at ×1 (the
 * clock's seconds times the preview's speed).
 */
export function gibMotionAt(gib: Gib, index: number, seconds: number): GibMotion {
  const speed = pick(gib.velocity, unit(index * 3 + 1)) * STEPS_PER_SECOND;
  const direction = (pick(gib.direction, unit(index * 3 + 2)) * Math.PI) / 180;
  const spin = pick(gib.angular, unit(index * 3 + 3)) * STEPS_PER_SECOND;
  const distance = speed * seconds;
  return {
    dx: Math.sin(direction) * distance,
    dy: -Math.cos(direction) * distance,
    angle: spin * seconds,
  };
}
