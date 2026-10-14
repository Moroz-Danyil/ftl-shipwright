/**
 * Where the game's hangar (the ship select screen) puts things, in the
 * pixels of its 1280 × 720 screen. Pure functions and constants.
 *
 * The positions were measured on a screenshot of the game's hangar with the
 * Kestrel, taken at twice the screen size (2560 × 1440), by scanning rows and
 * columns of pixels for the edges of the ship's walls and of the boxes, and
 * halving. The game's pictures put the boxes' outer edges a few pixels
 * inside the picture (a glow around them), so each box position below is
 * the measured edge minus that margin of its picture.
 */
import { type Point, type Ship, type ShipLayout } from "../../core";
import { isInstalled } from "../../app/systems/rules";
import { viewLimitPx } from "../viewLimit";

/** The game's screen. */
export const SCREEN = { width: 1280, height: 720 } as const;

/**
 * The screen position of the top-left corner of the view-limit frame
 * (`viewLimit.ts`, 19 × 13 cells). Measured on the Kestrel, whose frame
 * starts at ship pixel (0, 0): the wall between its airlock (cell column 0)
 * and the engine room lies at x = 400 on screen, one cell (35 px) right of
 * the frame's left edge; the wall under its top room (cell row 0, anchor
 * row 2) lies at y = 135, three cells below the frame's top edge.
 */
export const HANGAR_FRAME: Point = { x: 365, y: 30 };

/** The translation that draws ship pixels on the hangar screen: the view-limit frame lands on {@link HANGAR_FRAME}. */
export function hangarShipOffset(
  layout: Pick<ShipLayout, "xOffset" | "yOffset" | "horizontal" | "vertical">
): Point {
  const frame = viewLimitPx(layout);
  // Whole screen pixels, so the pictures stay crisp.
  return { x: Math.round(HANGAR_FRAME.x - frame.x), y: Math.round(HANGAR_FRAME.y - frame.y) };
}

/** A screen point of the hangar for a ship pixel. */
export function hangarScreenPoint(
  layout: Pick<ShipLayout, "xOffset" | "yOffset" | "horizontal" | "vertical">,
  p: Point
): Point {
  const offset = hangarShipOffset(layout);
  return { x: p.x + offset.x, y: p.y + offset.y };
}

/** The ship as the hangar shows it: only the systems installed at the start. */
export function hangarShip(ship: Ship): Ship {
  const systems = ship.blueprint.systems.filter(isInstalled);
  if (systems.length === ship.blueprint.systems.length) return ship;
  return { ...ship, blueprint: { ...ship.blueprint, systems } };
}

/** The pictures the screen is built from (`img/customizeUI/`). */
export const HANGAR_PICTURES = {
  background: "img/customizeUI/custom_background.png",
  shipName: "img/customizeUI/box_shipname.png",
} as const;

/** Top-left corners of the boxes (their pictures), on screen. */
export const HANGAR_BOXES = {
  shipName: { x: 6, y: 8 },
} as const;

/**
 * The size of a screen pixel when the 1280 × 720 screen fits a view of this
 * size: a whole number of device pixels when that loses little (at most a
 * fifth of the size), else the exact fit.
 */
export function hangarScale(width: number, height: number, devicePixelRatio = 1): number {
  const fit = Math.min(width / SCREEN.width, height / SCREEN.height);
  if (!(fit > 0)) return 1;
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const whole = Math.floor(fit * ratio);
  return whole >= 1 && whole / (fit * ratio) >= 0.8 ? whole / ratio : fit;
}
