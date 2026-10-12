/**
 * Mouse handling of the canvas: the wheel zooms around the cursor, the middle
 * button (or the left button while Space is held) pans, and a left click is
 * passed on to the current tool.
 */
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import type { Point } from "../core";
import { useEditor } from "../app/store";
import { panBy, screenToShip, wheelFactor, zoomAt } from "./viewport";

function localPoint(element: HTMLElement, clientX: number, clientY: number): Point {
  const rect = element.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

export function useCanvasInput(
  ref: RefObject<HTMLElement | null>,
  onClick: (shipPoint: Point, scale: number) => void
) {
  const [panning, setPanning] = useState(false);
  const last = useRef<Point | null>(null);

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
    const pan = event.button === 1 || (event.button === 0 && view.panHeld);
    if (pan) {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      last.current = { x: event.clientX, y: event.clientY };
      setPanning(true);
      return;
    }
    if (event.button !== 0) return;
    const p = localPoint(event.currentTarget, event.clientX, event.clientY);
    onClick(screenToShip(view.camera, p), view.camera.scale);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!last.current) return;
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    last.current = { x: event.clientX, y: event.clientY };
    const { view, setCamera } = useEditor.getState();
    setCamera(panBy(view.camera, dx, dy));
  };

  const endPan = (event: PointerEvent<HTMLElement>) => {
    if (!last.current) return;
    last.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setPanning(false);
  };

  return {
    panning,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
    },
  };
}
