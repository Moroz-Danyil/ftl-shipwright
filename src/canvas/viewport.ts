/**
 * Camera math for the canvas: screen = ship pixels · scale + (x, y).
 */
import type { Point, Rect } from "../core";
import type { Camera } from "../app/store";

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 8;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function screenToShip(camera: Camera, p: Point): Point {
  return { x: (p.x - camera.x) / camera.scale, y: (p.y - camera.y) / camera.scale };
}

export function shipToScreen(camera: Camera, p: Point): Point {
  return { x: p.x * camera.scale + camera.x, y: p.y * camera.scale + camera.y };
}

/** Zooms by `factor`, keeping the ship point under the screen point `at` in place. */
export function zoomAt(camera: Camera, factor: number, at: Point): Camera {
  const scale = clampScale(camera.scale * factor);
  const ship = screenToShip(camera, at);
  return { scale, x: at.x - ship.x * scale, y: at.y - ship.y * scale };
}

/** The zoom factor of one wheel event (`deltaY` in pixels; negative zooms in). */
export function wheelFactor(deltaY: number): number {
  return Math.pow(1.0015, -Math.max(-500, Math.min(500, deltaY)));
}

export function panBy(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, x: camera.x + dx, y: camera.y + dy };
}

/** A camera showing `rect` (ship pixels) centred in a view of `size`, with a margin in screen pixels. */
export function fitRect(
  rect: Rect,
  size: { width: number; height: number },
  margin = 48,
  maxScale = 2
): Camera {
  const w = Math.max(1, size.width - 2 * margin);
  const h = Math.max(1, size.height - 2 * margin);
  const scale = clampScale(Math.min(maxScale, w / Math.max(1, rect.w), h / Math.max(1, rect.h)));
  return {
    scale,
    x: size.width / 2 - (rect.x + rect.w / 2) * scale,
    y: size.height / 2 - (rect.y + rect.h / 2) * scale,
  };
}

/** The smallest rectangle holding all the given ones; `undefined` for none. */
export function unionRects(rects: Array<Rect | undefined>): Rect | undefined {
  const list = rects.filter((r): r is Rect => !!r && r.w > 0 && r.h > 0);
  if (list.length === 0) return undefined;
  const x0 = Math.min(...list.map((r) => r.x));
  const y0 = Math.min(...list.map((r) => r.y));
  const x1 = Math.max(...list.map((r) => r.x + r.w));
  const y1 = Math.max(...list.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
