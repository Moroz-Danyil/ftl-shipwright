/**
 * The ship on the game's grid, with zoom, pan and the current tool.
 */
import { useEffect, useRef } from "react";
import { currentTool, useEditor } from "../app/store";
import { useTexts } from "../text";
import { CanvasControls } from "./CanvasControls";
import { shipBounds } from "./fit";
import { CellZeroEdge, GridLines, ViewLimitFrame } from "./GridLayer";
import { ShipPictures } from "./ShipPictures";
import { Doors, Mounts, Rooms } from "./ShipShapes";
import { Stations } from "./Stations";
import { ToolOverlay } from "./ToolOverlay";
import { useCanvasTool } from "./tools/useCanvasTool";
import { useCanvasInput } from "./useCanvasInput";
import { useElementSize } from "./useElementSize";
import { fitRect, screenToShip } from "./viewport";

export function ShipCanvas() {
  const texts = useTexts();
  const doc = useEditor((s) => s.doc);
  const view = useEditor((s) => s.view);
  const selection = useEditor((s) => s.selection);
  const workspace = useEditor((s) => s.workspace);
  const toolId = useEditor(currentTool);
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  const fittedDoc = useRef<number | undefined>(undefined);
  const ship = doc?.history.present;
  const { tool, overlay } = useCanvasTool(toolId, workspace, texts);
  const { panning, handlers } = useCanvasInput(ref, tool);

  useEffect(() => {
    if (!doc || !size || size.width <= 0 || size.height <= 0) return;
    if (fittedDoc.current === doc.id) return;
    fittedDoc.current = doc.id;
    useEditor.getState().setCamera(fitRect(shipBounds(doc.history.present), size));
  }, [doc, size]);

  if (!doc || !ship) return null;
  const { camera, layers, hangarPreview } = view;
  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const topLeft = screenToShip(camera, { x: 0, y: 0 });
  const bottomRight = screenToShip(camera, { x: width, y: height });
  const area = {
    x: topLeft.x,
    y: topLeft.y,
    w: bottomRight.x - topLeft.x,
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
          <ShipPictures ship={ship} pictures={doc.pictures} layers={layers} />
          {layers.grid && !hangarPreview && width > 0 && (
            <>
              <GridLines area={area} />
              <CellZeroEdge ship={ship} area={area} />
            </>
          )}
          {layers.rooms && (
            <Rooms layout={ship.layout} selected={selection.rooms} showIds={!hangarPreview} />
          )}
          {layers.doors && <Doors layout={ship.layout} selected={selection.doors} />}
          {layers.stations && <Stations ship={ship} selected={selection.stations} />}
          {layers.mounts && <Mounts layout={ship.layout} layoutXml={ship.layoutXml} />}
          {!hangarPreview && <ViewLimitFrame ship={ship} />}
          <ToolOverlay ship={ship} overlay={overlay} />
        </g>
      </svg>
      <div className="cv-hint">{texts.workspaces[workspace].hint}</div>
      <CanvasControls />
    </main>
  );
}
