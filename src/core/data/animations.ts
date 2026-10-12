/**
 * Animation data (`data/animations.xml`, `data/dlcAnimations.xml`): sprite
 * sheets, animations and weapon animations, and helpers that cut frames.
 */
import type { Point, Rect } from "../model";
import { firstElement, textOf } from "../xml";
import type { GameView } from "./gameView";
import { childNumber, childText, numberAttribute, readTopLevelElements } from "./xmlLayers";

export const ANIMATION_FILES = ["data/animations.xml", "data/dlcAnimations.xml"] as const;

/** `<animSheet name w h fw fh>path</animSheet>`. */
export interface AnimSheet {
  name: string;
  /** Picture path in the game tree: `img/` + the element's text. */
  path: string;
  w: number;
  h: number;
  /** Frame width and height. */
  fw: number;
  fh: number;
}

/** `<anim name>`: `length` frames from column `x` of row `y` (rows counted from the bottom). */
export interface Anim {
  name: string;
  sheet: string;
  length: number;
  x: number;
  y: number;
  time?: number;
}

/** `<weaponAnim name>`. */
export interface WeaponAnim extends Anim {
  chargedFrame?: number;
  fireFrame?: number;
  firePoint?: Point;
  /** Pixel of the frame that sits on the ship's mount. */
  mountPoint?: Point;
}

export interface Animations {
  sheets: Record<string, AnimSheet>;
  anims: Record<string, Anim>;
  weaponAnims: Record<string, WeaponAnim>;
}

/** A frame cut out of a sheet picture. */
export interface SheetFrame {
  sheet: AnimSheet;
  /** Picture path (same as `sheet.path`). */
  path: string;
  /** The frame's rectangle in the sheet picture, top-left origin. */
  rect: Rect;
}

function point(el: ReturnType<typeof firstElement>): Point | undefined {
  if (!el) return undefined;
  return { x: numberAttribute(el, "x") ?? 0, y: numberAttribute(el, "y") ?? 0 };
}

/** Reads both animation files; a name defined again replaces the earlier one. */
export async function loadAnimations(view: GameView): Promise<Animations> {
  const result: Animations = {
    sheets: Object.create(null) as Record<string, AnimSheet>,
    anims: Object.create(null) as Record<string, Anim>,
    weaponAnims: Object.create(null) as Record<string, WeaponAnim>,
  };
  for (const file of ANIMATION_FILES) {
    for (const { element: el } of await readTopLevelElements(view, file)) {
      const name = el.attributes.name;
      if (name === undefined) continue;
      if (el.name === "animSheet") {
        result.sheets[name] = {
          name,
          path: `img/${textOf(el).trim()}`,
          w: numberAttribute(el, "w") ?? 0,
          h: numberAttribute(el, "h") ?? 0,
          fw: numberAttribute(el, "fw") ?? 0,
          fh: numberAttribute(el, "fh") ?? 0,
        };
      } else if (el.name === "anim" || el.name === "weaponAnim") {
        const desc = firstElement(el.children, "desc");
        const anim: WeaponAnim = {
          name,
          sheet: childText(el, "sheet") ?? "",
          length: desc ? (numberAttribute(desc, "length") ?? 0) : 0,
          x: desc ? (numberAttribute(desc, "x") ?? 0) : 0,
          y: desc ? (numberAttribute(desc, "y") ?? 0) : 0,
        };
        const time = childNumber(el, "time");
        if (time !== undefined) anim.time = time;
        if (el.name === "anim") {
          result.anims[name] = anim;
          continue;
        }
        const charged = childNumber(el, "chargedFrame");
        const fire = childNumber(el, "fireFrame");
        const firePoint = point(firstElement(el.children, "firePoint"));
        const mountPoint = point(firstElement(el.children, "mountPoint"));
        if (charged !== undefined) anim.chargedFrame = charged;
        if (fire !== undefined) anim.fireFrame = fire;
        if (firePoint) anim.firePoint = firePoint;
        if (mountPoint) anim.mountPoint = mountPoint;
        result.weaponAnims[name] = anim;
      }
    }
  }
  return result;
}

/** The rectangle of the frame at `column`, `rowFromBottom` in a sheet (row 0 is the bottom row). */
export function sheetFrameRect(
  sheet: Pick<AnimSheet, "h" | "fw" | "fh">,
  column: number,
  rowFromBottom: number
): Rect {
  return {
    x: column * sheet.fw,
    y: sheet.h - (rowFromBottom + 1) * sheet.fh,
    w: sheet.fw,
    h: sheet.fh,
  };
}

/** Frame `frame` (0 = first) of an animation, or `undefined` when its sheet is unknown. */
export function animFrame(animations: Animations, anim: Anim, frame = 0): SheetFrame | undefined {
  const sheet = Object.prototype.hasOwnProperty.call(animations.sheets, anim.sheet)
    ? animations.sheets[anim.sheet]
    : undefined;
  if (!sheet) return undefined;
  return { sheet, path: sheet.path, rect: sheetFrameRect(sheet, anim.x + frame, anim.y) };
}

/** A weapon's resting picture (frame 0 of its `weaponAnim`) and mount point. */
export function weaponRestingFrame(
  animations: Animations,
  weaponArt: string
): (SheetFrame & { anim: WeaponAnim; mountPoint?: Point }) | undefined {
  const anim = Object.prototype.hasOwnProperty.call(animations.weaponAnims, weaponArt)
    ? animations.weaponAnims[weaponArt]
    : undefined;
  if (!anim) return undefined;
  const frame = animFrame(animations, anim, 0);
  if (!frame) return undefined;
  return anim.mountPoint ? { ...frame, anim, mountPoint: anim.mountPoint } : { ...frame, anim };
}

/** A crew race's picture: frame 0 of `<race>_walk_down`. */
export function raceWalkDownFrame(
  animations: Animations,
  race: string
): (SheetFrame & { anim: Anim }) | undefined {
  const key = `${race}_walk_down`;
  const anim = Object.prototype.hasOwnProperty.call(animations.anims, key)
    ? animations.anims[key]
    : undefined;
  if (!anim) return undefined;
  const frame = animFrame(animations, anim, 0);
  return frame && { ...frame, anim };
}
