/**
 * Where the pointer rests on the canvas, if it is there, so that a paste
 * can put things under it. It is kept in screen pixels of the canvas, so a
 * zoom or pan without a move of the pointer still finds the right ship pixel.
 */
import type { Point } from "../core";
import { screenToShip } from "../canvas/viewport";
import type { Camera } from "./store";

let local: Point | null = null;

/** The pointer in canvas pixels (from its top-left), or `null` when it left the canvas. */
export function setCanvasPointer(point: Point | null): void {
  local = point;
}

/** The pointer in ship pixels with this camera, or `undefined` when it is not on the canvas. */
export function canvasPointer(camera: Camera): Point | undefined {
  return local ? screenToShip(camera, local) : undefined;
}
