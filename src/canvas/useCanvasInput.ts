/**
 * Mouse handling of the canvas: the wheel zooms around the cursor, the middle
 * button (or the left button while Space is held) pans, a right click cancels
 * the current drag, and everything else goes to the current tool.
 */
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import type { Point } from "../core";
import { useEditor } from "../app/store";
import type { CanvasTool, ToolPointer } from "./tools/types";
import { panBy, screenToShip, wheelFactor, zoomAt } from "./viewport";

function localPoint(element: HTMLElement, clientX: number, clientY: number): Point {
  const rect = element.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function toolPointer(event: PointerEvent<HTMLElement>): ToolPointer {
  const { camera } = useEditor.getState().view;
  const local = localPoint(event.currentTarget, event.clientX, event.clientY);
  return { p: screenToShip(camera, local), shift: event.shiftKey, scale: camera.scale };
}

export function useCanvasInput(ref: RefObject<HTMLElement | null>, tool: CanvasTool) {
  const [panning, setPanning] = useState(false);
  const last = useRef<Point | null>(null);
  const toolDown = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { view, setCamera } = useEditor.getState();
      const at = localPoint(element, event.clientX, event.clientY);
      const delta = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY;
      setCamera(zoomAt(view.camera, wheelFactor(delta), at));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [ref]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const { view } = useEditor.getState();
    if (event.button === 1 || (event.button === 0 && view.panHeld)) {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      last.current = { x: event.clientX, y: event.clientY };
      setPanning(true);
      return;
    }
    if (event.button === 2) {
      toolDown.current = false;
      tool.cancel();
      return;
    }
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    toolDown.current = true;
    tool.down(toolPointer(event));
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!last.current) {
      tool.move(toolPointer(event));
      return;
    }
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    last.current = { x: event.clientX, y: event.clientY };
    const { view, setCamera } = useEditor.getState();
    setCamera(panBy(view.camera, dx, dy));
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (last.current) {
      last.current = null;
      setPanning(false);
      return;
    }
    if (event.button !== 0 || !toolDown.current) return;
    toolDown.current = false;
    tool.up(toolPointer(event));
  };

  const onPointerCancel = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    last.current = null;
    setPanning(false);
    toolDown.current = false;
    tool.cancel();
  };

  return {
    panning,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave: () => tool.leave(),
      onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
    },
  };
}
