/**
 * The current tool of the canvas, with the overlay it draws. The Select tool
 * moves rooms only in Rooms and picks mounts and gibs in Hull; every Hull
 * tool also turns the selected gib's direction with its fan.
 */
import { useEffect, useMemo, useState } from "react";
import { setGestureCancel } from "../../app/gesture";
import { useEditor } from "../../app/store";
import type { ToolId, WorkspaceId } from "../../app/workspaces";
import type { Texts } from "../../text";
import {
  createArtSelectTool,
  createGibTool,
  createMountTool,
  createMovePictureTool,
  withGibDirection,
} from "./artTools";
import { createDoorTool, createRoomTool, createStationTool } from "./placeTools";
import { createSelectTool } from "./selectTool";
import type { CanvasTool, Overlay, ToolContext } from "./types";

const IDLE: CanvasTool = {
  down() {},
  move() {},
  up() {},
  leave() {},
  cancel() {},
};

function sameOverlay(a: Overlay | null, b: Overlay | null): boolean {
  return a === b || (a !== null && b !== null && JSON.stringify(a) === JSON.stringify(b));
}

export function createTool(
  id: ToolId,
  context: ToolContext,
  workspace: WorkspaceId = "rooms"
): CanvasTool {
  const tool = createPlainTool(id, context, workspace);
  return workspace === "hull" ? withGibDirection(tool, context) : tool;
}

function createPlainTool(id: ToolId, context: ToolContext, workspace: WorkspaceId): CanvasTool {
  if (id === "select")
    return workspace === "hull"
      ? createArtSelectTool(context)
      : createSelectTool(context, workspace === "rooms");
  if (id === "room") return createRoomTool(context);
  if (id === "door") return createDoorTool(context);
  if (id === "station") return createStationTool(context);
  if (id === "movePicture") return createMovePictureTool(context);
  if (id === "mount") return createMountTool(context);
  if (id === "gib") return createGibTool(context);
  return IDLE;
}

export function useCanvasTool(
  id: ToolId,
  workspace: WorkspaceId,
  texts: Texts
): { tool: CanvasTool; overlay: Overlay | null } {
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const tool = useMemo(
    () =>
      createTool(
        id,
        {
          texts,
          setOverlay: (next) => setOverlay((old) => (sameOverlay(old, next) ? old : next)),
          setGesture: setGestureCancel,
          say: (text) => useEditor.getState().setNotice({ kind: "info", text }),
        },
        workspace
      ),
    [id, workspace, texts]
  );
  useEffect(
    () => () => {
      tool.cancel();
      setOverlay(null);
    },
    [tool]
  );
  return { tool, overlay };
}
