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
import { type Point, type Rect, type Ship, type ShipLayout } from "../../core";
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

/** The pictures the screen is built from (`img/customizeUI/` and `img/upgradeUI/Equipment/`). */
export const HANGAR_PICTURES = {
  background: "img/customizeUI/custom_background.png",
  shipName: "img/customizeUI/box_shipname.png",
  shipSelect: "img/customizeUI/box_shipselect.png",
  arrow: "img/customizeUI/button_arrow_on.png",
  achievements: "img/customizeUI/box_shipach.png",
  start: "img/customizeUI/box_start.png",
  advanced: "img/customizeUI/box_advanced.png",
  system: "img/customizeUI/box_system_on.png",
  equipment: "img/customizeUI/box_shipequip.png",
  crewOn: "img/upgradeUI/Equipment/box_crew_on.png",
  crewOff: "img/upgradeUI/Equipment/box_crew_off.png",
  customize: "img/customizeUI/box_crewcustom_on.png",
  weaponOn: "img/upgradeUI/Equipment/box_weapons_on.png",
  weaponOff: "img/upgradeUI/Equipment/box_weapons_off.png",
  droneOn: "img/upgradeUI/Equipment/box_drones_on.png",
  droneOff: "img/upgradeUI/Equipment/box_drones_off.png",
  augmentOn: "img/upgradeUI/Equipment/box_augment_on.png",
  augmentOff: "img/upgradeUI/Equipment/box_augment_off.png",
} as const;

/** Top-left corners of the boxes (their pictures), on screen. */
export const HANGAR_BOXES = {
  shipName: { x: 6, y: 8 },
  shipSelect: { x: 0, y: 106 },
  achievements: { x: 0, y: 356 },
  start: { x: 964, y: 0 },
  advanced: { x: 976, y: 384 },
  equipment: { x: 0, y: 478 },
} as const;

/** The colours of the hangar's texts and buttons. */
export const HANGAR_COLOURS = {
  /** Labels on light buttons, and the frame titles. */
  dark: "#193133",
  /** Titles on dark bars, and the light buttons. */
  light: "#ebf5e5",
  /** The chosen button (difficulty, layout, Advanced Edition). */
  chosen: "#ffe65e",
  /** Names. */
  white: "#ffffff",
} as const;

/** A button the game draws itself: a rectangle with its corners cut off. */
export interface HangarButtonRect extends Rect {
  /** How far each corner is cut, along both edges. */
  cut: number;
}

/**
 * The hangar's buttons, measured like the boxes; their labels are centred
 * on them. The layout buttons A, B and C sit 45 px apart from the first.
 */
export const HANGAR_BUTTONS = {
  rename: { x: 14, y: 16, w: 93, h: 31, cut: 6 },
  list: { x: 70, y: 145, w: 50, h: 28, cut: 4 },
  randomShip: { x: 19, y: 178, w: 151, h: 32, cut: 4 },
  layoutA: { x: 34, y: 248, w: 32, h: 34, cut: 4 },
  layoutPitch: 45,
  hideRooms: { x: 20, y: 301, w: 151, h: 28, cut: 4 },
  easy: { x: 977, y: 14, w: 94, h: 24, cut: 4 },
  normal: { x: 977, y: 40, w: 94, h: 23, cut: 4 },
  hard: { x: 977, y: 66, w: 94, h: 24, cut: 4 },
  start: { x: 1082, y: 28, w: 148, h: 48, cut: 4 },
  advancedOff: { x: 995, y: 425, w: 107, h: 22, cut: 3 },
  advancedOn: { x: 1127, y: 425, w: 101, h: 22, cut: 3 },
  /** The Customize button of a crew card, from the card's top-left corner. */
  customize: { x: 4, y: 70, w: 91, h: 12, cut: 2 },
} as const;

/** The outline of a rectangle with its corners cut off, as SVG polygon points. */
export function cutCornerPoints({ x, y, w, h, cut }: HangarButtonRect): string {
  const r = x + w;
  const b = y + h;
  return [
    [x + cut, y],
    [r - cut, y],
    [r, y + cut],
    [r, b - cut],
    [r - cut, b],
    [x + cut, b],
    [x, b - cut],
    [x, y + cut],
  ]
    .map(([px, py]) => `${px},${py}`)
    .join(" ");
}

/** The middle of a rectangle. */
export function rectMiddle(r: Rect): Point {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/**
 * Where the hangar's texts go that are not on a button: the frame titles by
 * their left edge and baseline, the ship's name and the box titles.
 */
export const HANGAR_TEXTS = {
  shipTitle: { x: 19, y: 133 },
  layoutTitle: { x: 19, y: 235 },
  /**
   * The middle of the ship's name field and the name's baseline. The game
   * spaces the name's letters one font pixel wider than the font says.
   */
  shipName: { x: 274, y: 42, maxWidth: 310, letterSpacing: 1 },
  achievementsTitle: { x: 18, y: 386 },
  /** Centred. */
  advancedTitle: { x: 1112, y: 411 },
} as const;

/** The systems bar: one 38 × 96 box per system, side by side from x = 373. */
export const SYSTEM_BAR = {
  x: 373,
  y: 380,
  width: 38,
  /** The bottom edge of the lowest power bar. */
  barsBottom: 440,
  /** The highest the power bars may reach. */
  barsTop: 406,
  barWidth: 16,
  /** A bar and the gap above it. */
  barPitch: 8,
  barGap: 2,
  /** The system's icon (64 × 64, its circle in the middle) is drawn at this height. */
  iconY: 425,
  iconSize: 64,
} as const;

/**
 * The order of the systems in the bar: the main systems in the game's order,
 * then the subsystems (the Kestrel shows shields, engines, oxygen, weapons,
 * medbay, then piloting, sensors, doors).
 */
export const HANGAR_SYSTEM_ORDER = [
  "shields",
  "engines",
  "oxygen",
  "weapons",
  "drones",
  "medbay",
  "clonebay",
  "teleporter",
  "cloaking",
  "artillery",
  "mind",
  "hacking",
  "pilot",
  "sensors",
  "doors",
  "battery",
] as const;

/** The green icon the hangar shows for a system (64 × 64). */
export function hangarSystemIconPath(system: string): string {
  return `img/icons/s_${system}_green1.png`;
}

export interface PowerBar {
  y: number;
  height: number;
}

export interface SystemColumn {
  system: string;
  power: number;
  /** Left edge of the column's box. */
  x: number;
  /** The power bars, lowest first. */
  bars: PowerBar[];
}

/** The power bars of a system at a level: 6 px tall with 2 px gaps, packed closer above level 4 so they stay in the box. */
export function powerBars(level: number): PowerBar[] {
  const count = Math.max(0, Math.floor(level));
  if (count === 0) return [];
  const room = SYSTEM_BAR.barsBottom - SYSTEM_BAR.barsTop;
  const pitch = Math.min(SYSTEM_BAR.barPitch, Math.floor(room / count));
  const height = Math.max(1, pitch - SYSTEM_BAR.barGap);
  return Array.from({ length: count }, (_, i) => ({
    y: SYSTEM_BAR.barsBottom - height - i * pitch,
    height,
  }));
}

function orderOf(system: string): number {
  const i = (HANGAR_SYSTEM_ORDER as readonly string[]).indexOf(system);
  return i < 0 ? HANGAR_SYSTEM_ORDER.length : i;
}

/** The systems bar: one column per system installed at the start, in the hangar's order. */
export function systemColumns(ship: Ship): SystemColumn[] {
  return ship.blueprint.systems
    .filter(isInstalled)
    .map((s, i) => ({ s, i }))
    .sort((a, b) => orderOf(a.s.system) - orderOf(b.s.system) || a.i - b.i)
    .map(({ s }, column) => ({
      system: s.system,
      power: s.power,
      x: SYSTEM_BAR.x + column * SYSTEM_BAR.width,
      bars: powerBars(s.power),
    }));
}

/** The equipment panel's frame titles (left edge and baseline) and panes. */
export const EQUIPMENT = {
  titleY: 505,
  crewTitleX: 19,
  weaponsTitleX: 388,
  dronesTitleY: 615,
  augmentsTitleX: 954,
  /** The weapons pane, and the drones pane under it. */
  weaponsPane: { x: 381, y: 511, w: 560, h: 87 },
  dronesPane: { x: 381, y: 621, w: 560, h: 87 },
} as const;

/** The crew cards: two columns, two rows. */
export const CREW_CARDS = {
  x: 70,
  y: 519,
  columnPitch: 160,
  rowPitch: 93,
  columns: 2,
  count: 4,
  width: 100,
  /** The middle of the crew member's picture (drawn at twice its size), from the card's corner. */
  pictureMiddle: { x: 51, y: 28 },
  crewScale: 2,
  /** The baseline of the name. */
  nameY: 62,
  /** The Customize button under the card. */
  buttonY: 64,
} as const;

/** The top-left corner of crew card `i` (row by row). */
export function crewCardAt(i: number): Point {
  const column = i % CREW_CARDS.columns;
  const row = Math.floor(i / CREW_CARDS.columns);
  return {
    x: CREW_CARDS.x + column * CREW_CARDS.columnPitch,
    y: CREW_CARDS.y + row * CREW_CARDS.rowPitch,
  };
}

/** A weapon or drone slot box (109 × 76, its rectangle 9 px in from the round badge). */
export const ITEM_SLOT = {
  width: 109,
  height: 76,
  /** Slots of four sit 117 px apart. */
  pitch: 117,
  /** The middle of the Kestrel's four weapon slots, measured: the first one at x = 435. */
  centreX: 665,
  /** The picture area: its middle. */
  picture: { x: 58, y: 33, w: 96, h: 44 },
  /** The baseline of the name. */
  nameY: 71,
} as const;

/**
 * The left edges of `count` slots, centred on the pane; closer together
 * when more than four would not fit the pane.
 */
export function itemSlotsX(count: number, pane: Rect = EQUIPMENT.weaponsPane): number[] {
  if (count <= 0) return [];
  const room = pane.w - ITEM_SLOT.width;
  const pitch = count > 1 ? Math.min(ITEM_SLOT.pitch, Math.floor(room / (count - 1))) : 0;
  const total = ITEM_SLOT.width + (count - 1) * pitch;
  const left = Math.round(ITEM_SLOT.centreX - total / 2);
  return Array.from({ length: count }, (_, i) => left + i * pitch);
}

/** The top edges of the weapon slots and of the drone slots. */
export const ITEM_SLOTS_Y = { weapon: 514, drone: 624 } as const;

/** The augment boxes: three, 60 px apart. */
export const AUGMENT_BOXES = { x: 988, y: 529, pitch: 60, count: 3, width: 235, height: 40 };

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
