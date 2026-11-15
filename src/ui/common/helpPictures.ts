/**
 * The game's interface pictures the hover help draws its values with, and
 * where their parts lie. Pure functions and constants.
 *
 * The positions were measured on the pictures themselves, by scanning rows
 * and columns of pixels for the edges of their frames and cells.
 */
import type { Rect } from "../../core";

/** The pictures, from the game's interface folders. */
export const HUD_PICTURES = {
  /** The hull bar's frame at the top left of the game's screen (385 × 65). */
  hull: "img/statusUI/top_hull.png",
  /** The hull bar's 30 cells, white where the bar is filled (360 × 65). */
  hullMask: "img/statusUI/top_hull_bar_mask.png",
  /** The light tab the word HULL is written on (52 × 28). */
  hullLabel: "img/statusUI/top_hull_label.png",
  /** The reactor's wire, beside which the game draws the reactor's power bars (56 × 340). */
  reactor: "img/wireUI/wire_full.png",
  /** The light tab under the weapon or drone box, at the end of its label (53 × 27). */
  boxLabel: "img/box_weapons_bottom_label.png",
  missiles: "img/statusUI/top_missiles_on.png",
  droneParts: "img/statusUI/top_drones_on.png",
  fuel: "img/statusUI/top_fuel_on.png",
} as const;

/**
 * The hull bar: the mask's cells are 11 px wide with a 1 px gap, 30 of them,
 * one per hull point. The mask lies 8 px right of the frame's picture (its
 * steps then meet the frame's); the tab lies at the frame's top-left corner.
 */
export const HULL_BAR = {
  cells: 30,
  pitch: 12,
  maskX: 8,
  /** The part of the frame's picture that holds the frame, the tab and their glow. */
  view: { x: 0, y: 0, w: 381, h: 52 },
  /** Where the word HULL goes on the tab: its left edge and the middle of its capitals. */
  label: { x: 10, y: 20 },
} as const;

/** How many cells of the hull bar the game fills for a hull: one per point, at most 30. */
export function hullCells(hull: number): number {
  return Math.max(0, Math.min(HULL_BAR.cells, Math.floor(hull)));
}

/**
 * The reactor: the wire runs down the left (x 5 to 25) and turns right at the
 * bottom (from y 299); the power bars stand right of it, lowest first. The
 * game draws the bars itself (they are no picture), 6 px tall with 3 px gaps
 * as the notches of the wire.
 */
export const REACTOR = {
  view: { x: 4, y: 8, w: 56, h: 312 },
  barX: 28,
  barWidth: 24,
  barHeight: 6,
  barPitch: 9,
  /** The bottom edge of the lowest bar. */
  barsBottom: 295,
  /** The most bars a reactor can have in the game (upgraded in stores). */
  maxBars: 25,
} as const;

/** The reactor's power bars at a power, lowest first: one per point, at most 25. */
export function reactorBars(power: number): Rect[] {
  const count = Math.max(0, Math.min(REACTOR.maxBars, Math.floor(power)));
  return Array.from({ length: count }, (_, i) => ({
    x: REACTOR.barX,
    y: REACTOR.barsBottom - REACTOR.barHeight - i * REACTOR.barPitch,
    w: REACTOR.barWidth,
    h: REACTOR.barHeight,
  }));
}

/** The slot counts the game has a weapon box for (`img/box_weapons_bottom2.png` to `…4`). */
export const SLOT_BOX_COUNTS = [2, 3, 4] as const;

/**
 * The box the game draws for a number of weapon or drone slots (it uses the
 * same boxes for both): the box for that count, else the nearest one there is.
 */
export function slotBox(count: number): { path: string; slots: number; exact: boolean } {
  const slots = Math.max(SLOT_BOX_COUNTS[0], Math.min(SLOT_BOX_COUNTS[2], Math.round(count)));
  return { path: `img/box_weapons_bottom${slots}.png`, slots, exact: slots === count };
}

/**
 * The weapon box: the frame and its glow, the slanted bracket at its bottom
 * left (x 10 to 17, y 59 to 82) and right of it the label, on a light band as
 * tall as the tab that ends it.
 */
export const SLOT_BOX = {
  view: { x: 2, y: 2, w: 0, h: 84 },
  /** The light band under the box: from its left edge to the tab. */
  band: { x: 17, y: 61, h: 20 },
  /** The label's left edge and the middle of its capitals. */
  label: { x: 22, y: 70 },
  /** The full part of the tab at its bottom: the band runs this far into it. */
  tabOverlap: 12,
} as const;

/** The view of a box picture of a width: its frame and glow, with the label under it. */
export function slotBoxView(pictureWidth: number): Rect {
  return { ...SLOT_BOX.view, w: pictureWidth - SLOT_BOX.view.x };
}

/**
 * A count in the top panel (missiles, drone parts, fuel): the icon on its
 * light tab, the number in the middle of the dark box right of it.
 */
export const COUNTER = {
  view: { x: 2, y: 0, w: 74, h: 40 },
  number: { x: 52, y: 22, maxWidth: 30 },
  /** The light tab with the icon alone, for the fuel line. */
  icon: { x: 7, y: 3, w: 35, h: 34 },
} as const;
