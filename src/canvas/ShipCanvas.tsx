/**
 * The ship on the game's grid, with zoom, pan and the current tool.
 */
import { useEffect, useRef } from "react";
import { currentTool, useEditor } from "../app/store";
import { useTexts } from "../text";
import { CanvasControls } from "./CanvasControls";
import { setCanvasElement } from "./canvasElement";
import { shipBounds } from "./fit";
import { ShipScene } from "./ShipScene";
import { SlotBar } from "./SlotBar";
import { useCanvasTool } from "./tools/useCanvasTool";
import { useCanvasInput } from "./useCanvasInput";
import { useElementSize } from "./useElementSize";
import { useExplosion } from "./useExplosion";
import { fitRect, screenToShip } from "./viewport";

export function ShipCanvas() {
  const texts = useTexts();
  const doc = useEditor((s) => s.doc);
  const view = useEditor((s) => s.view);
  const workspace = useEditor((s) => s.workspace);
  const toolId = useEditor(currentTool);
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  const fittedDoc = useRef<number | undefined>(undefined);
  const { tool, overlay } = useCanvasTool(toolId, workspace, texts);
  const { panning, handlers } = useCanvasInput(ref, tool);
  const explosion = useExplosion();
  const hasDoc = doc !== undefined;

  useEffect(() => {
    setCanvasElement(ref.current);
    return () => setCanvasElement(null);
  }, [hasDoc]);

  useEffect(() => {
    if (!doc || !size || size.width <= 0 || size.height <= 0) return;
    if (fittedDoc.current === doc.id) return;
    fittedDoc.current = doc.id;
    useEditor.getState().setCamera(fitRect(shipBounds(doc.history.present.ship), size));
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

  return (
    <main
      ref={ref}
      className={`cv-canvas ${cursor}`}
      aria-label={texts.canvas.label}
      data-tool={toolId}
      {...handlers}
    >
      <svg className="cv-svg" width={width} height={height} data-testid="ship-svg">
        <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`}>
          <ShipScene area={area} overlay={overlay} explosion={explosion.seconds} />
        </g>
      </svg>
      <div className="cv-hint">{texts.workspaces[workspace].hint}</div>
      {workspace === "loadout" && <SlotBar />}
      <CanvasControls onPlayExplosion={workspace === "art" ? explosion.play : undefined} />
    </main>
  );
}
