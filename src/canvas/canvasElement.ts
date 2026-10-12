/**
 * The canvas element of the editor, so that drags starting outside it (a
 * system chip from the palette) can find the ship point under the pointer.
 */
import type { Point } from "../core";
import { useEditor } from "../app/store";
import { screenToShip } from "./viewport";

let element: HTMLElement | null = null;

export function setCanvasElement(el: HTMLElement | null): void {
  element = el;
}

/** The ship pixel under a window point, or `undefined` when the point is not over the canvas. */
export function clientToShip(clientX: number, clientY: number): Point | undefined {
  if (!element) return undefined;
  const rect = element.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return undefined;
  return screenToShip(useEditor.getState().view.camera, { x, y });
}
