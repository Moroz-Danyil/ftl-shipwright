/**
 * What the canvas tools share: the pointer as they see it, what they draw
 * over the ship while working, and their common shape.
 */
import type { Point, Rect } from "../../core";
import type { WallSegment } from "../../app/layout/doors";
import type { Target } from "../../app/selection";
import type { Texts } from "../../text";

export interface ToolPointer {
  /** The pointer in ship pixels. */
  p: Point;
  shift: boolean;
  /** The zoom, to turn screen distances into ship pixels. */
  scale: number;
}

/** What a tool draws over the ship. Rectangles in `cells` are in the ship's cells, `box` in ship pixels. */
export type Overlay =
  | { kind: "hover"; target: Target }
  | { kind: "box"; rect: Rect }
  | { kind: "ghost"; cells: Rect[]; ok: boolean }
  | { kind: "wall"; wall: WallSegment; exists: boolean }
  | { kind: "cell"; cell: Point; ok: boolean }
  | { kind: "outline"; rect: Rect }
  | { kind: "artGhost"; mounts: Point[]; gibs: Rect[] };

export interface CanvasTool {
  down(pointer: ToolPointer): void;
  move(pointer: ToolPointer): void;
  up(pointer: ToolPointer): void;
  /** The pointer left the canvas. */
  leave(): void;
  /** Esc or a right click: drop the drag in progress without a change. */
  cancel(): void;
}

export interface ToolContext {
  texts: Texts;
  setOverlay(overlay: Overlay | null): void;
  /** Called when a drag starts, with how to cancel it, and with `null` when it ends. */
  setGesture(cancel: (() => void) | null): void;
  /** Shows a short message (a refused move, a cell without a station system). */
  say(text: string): void;
}

/** Screen pixels the pointer must travel before a press becomes a drag. */
export const DRAG_THRESHOLD = 4;

export function draggedFar(start: Point, p: Point, scale: number): boolean {
  return Math.hypot(p.x - start.x, p.y - start.y) * scale >= DRAG_THRESHOLD;
}
