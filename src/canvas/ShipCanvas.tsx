/**
 * The ship on the game's grid, with zoom, pan and the current tool, and the
 * workspace's tools in a bar at the top. In Rooms, a ship without rooms gets
 * a hint where to start and the cell where the game places ships marked. A ship opens
 * centred on its rooms and hull. Objects flashed after a click in the Overview are
 * brought into view.
 */
import { useEffect, useRef } from "react";
import { setCanvasPointer } from "../app/pointer";
import { currentTool, useEditor } from "../app/store";
import { useTexts } from "../text";
import { CanvasControls } from "./CanvasControls";
import { EmptyShipHint } from "./EmptyShipHint";
import { setCanvasElement } from "./canvasElement";
import { openingBounds } from "./fit";
import { ShipScene } from "./ShipScene";
import { SlotBar } from "./SlotBar";
import { ToolBar } from "./ToolBar";
import { useCanvasTool } from "./tools/useCanvasTool";
import { useCanvasInput } from "./useCanvasInput";
import { useElementSize } from "./useElementSize";
import { useExplosion } from "./useExplosion";
import { objectRectsPx } from "./objectRects";
import { cameraShowing, fitRect, screenToShip, unionRects } from "./viewport";

export function ShipCanvas() {
  const texts = useTexts();
  const doc = useEditor((s) => s.doc);
  const view = useEditor((s) => s.view);
  const workspace = useEditor((s) => s.workspace);
  const toolId = useEditor(currentTool);
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  const fittedDoc = useRef<number | undefined>(undefined);
  const { tool, overlay, cursor: toolCursor } = useCanvasTool(toolId, workspace, texts);
  const { panning, handlers } = useCanvasInput(ref, tool);
  const explosion = useExplosion();
  const hasDoc = doc !== undefined;

  useEffect(() => {
    setCanvasElement(ref.current);
    return () => {
      setCanvasElement(null);
      setCanvasPointer(null);
    };
  }, [hasDoc]);

  // Objects flashed after a click in the Overview are brought into view, once per flash.
  const flash = useEditor((s) => s.flash);
  const shownFlash = useRef<number | undefined>(undefined);
  useEffect(() => {
    const state = useEditor.getState();
    const snapshot = state.doc?.history.present;
    if (!flash || !snapshot || !size || size.width <= 0 || size.height <= 0) return;
    if (shownFlash.current === flash.key) return;
    shownFlash.current = flash.key;
    const rect = unionRects(objectRectsPx(snapshot.ship, snapshot.art, flash.objects));
    if (!rect) return;
    const camera = state.view.camera;
    const next = cameraShowing(camera, rect, size);
    if (next !== camera) state.setCamera(next);
  }, [flash, size]);

  useEffect(() => {
    if (!doc || !size || size.width <= 0 || size.height <= 0) return;
    if (fittedDoc.current === doc.id) return;
    fittedDoc.current = doc.id;
    useEditor.getState().setCamera(fitRect(openingBounds(doc.history.present.ship), size));
  }, [doc, size]);

  if (!doc) return null;
  const { camera } = view;
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const topLeft = screenToShip(camera, { x: 0, y: 0 });
  const bottomRight = screenToShip(camera, { x: width, y: height });
  const area = {
    x: topLeft.x,
    y: topLeft.y,
    w: width > 0 ? bottomRight.x - topLeft.x : 0,
    h: bottomRight.y - topLeft.y,
  };
  const cursor = panning ? "cv-panning" : view.panHeld ? "cv-pan-ready" : "";
  const noRooms = doc.history.present.ship.layout.rooms.length === 0;

  return (
    <main
      ref={ref}
      className={`cv-canvas ${cursor}`}
      aria-label={texts.canvas.label}
      data-tool={toolId}
      data-tour="canvas"
      style={toolCursor && !panning && !view.panHeld ? { cursor: toolCursor } : undefined}
      {...handlers}
    >
      <svg className="cv-svg" width={width} height={height} data-testid="ship-svg">
        <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`}>
          <ShipScene area={area} overlay={overlay} explosion={explosion.seconds} />
        </g>
      </svg>
      {workspace === "rooms" && noRooms && !view.hangarPreview && <EmptyShipHint />}
      <ToolBar />
      {workspace === "ship" && <SlotBar />}
      <CanvasControls onPlayExplosion={workspace === "hull" ? explosion.play : undefined} />
    </main>
  );
}
