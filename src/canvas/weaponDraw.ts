/**
 * How a weapon is drawn on its mount.
 *
 * Our reading of the game, to be confirmed in the game: the weapon's resting
 * frame is placed so that its mount point lies on the mount, mirrored
 * horizontally (about the mount point) when the mount has `mirror`, and then
 * turned 90° clockwise (about the mount point) when it has `rotate`.
 */
import { weaponRestingFrame, type Point, type Rect } from "../core";
import type { GameData } from "../app/store";

export interface MountPose {
  rotate: boolean;
  mirror: boolean;
}

/** The SVG transform that draws a frame (its own pixels) on a mount at `at` (ship pixels). */
export function weaponTransform(at: Point, mountPoint: Point, pose: MountPose): string {
  const parts = [`translate(${at.x} ${at.y})`];
  if (pose.rotate) parts.push("rotate(90)");
  if (pose.mirror) parts.push("scale(-1 1)");
  parts.push(`translate(${-mountPoint.x} ${-mountPoint.y})`);
  return parts.join(" ");
}

/** Where a pixel of the frame ends up on the ship: the same transform, as a function. */
export function weaponFramePoint(at: Point, mountPoint: Point, pose: MountPose, p: Point): Point {
  let x = p.x - mountPoint.x;
  let y = p.y - mountPoint.y;
  if (pose.mirror) x = -x;
  if (pose.rotate) [x, y] = [-y, x];
  return { x: at.x + x, y: at.y + y };
}

/** A weapon's resting frame: the sheet picture, the frame in it and its mount point. */
export interface WeaponFrame {
  path: string;
  sheet: { w: number; h: number };
  rect: Rect;
  mountPoint: Point;
}

/** The resting frames of the ship's equipped weapons, in mount order. */
export function equippedWeaponFrames(
  data: GameData | undefined,
  weapons: string[] | undefined
): Array<WeaponFrame | undefined> {
  if (!data || !weapons) return [];
  return weapons.map((name) => {
    const art = data.catalogs.weapons.find((w) => w.name === name)?.weaponArt;
    const frame = art ? weaponRestingFrame(data.animations, art) : undefined;
    if (!frame) return undefined;
    return {
      path: frame.path,
      sheet: { w: frame.sheet.w, h: frame.sheet.h },
      rect: frame.rect,
      mountPoint: frame.mountPoint ?? { x: 0, y: 0 },
    };
  });
}
