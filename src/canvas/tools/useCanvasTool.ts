/**
 * The current tool of the canvas, with the overlay it draws and the pointer
 * look it asks for. The Select tool is the same in every workspace (it picks
 * and drags anything); in Rooms it also resizes the selected room with its
 * handles. Every Hull tool also turns the selected gib's direction with its
 * fan, and every Rooms and Hull tool places rooms being pasted.
 */
import { useEffect, useMemo, useState } from "react";
import { setGestureCancel } from "../../app/gesture";
import { useEditor } from "../../app/store";
import type { ToolId, WorkspaceId } from "../../app/workspaces";
import type { Texts } from "../../text";
import {
  createGibTool,
  createMountTool,
  createMovePictureTool,
  withGibDirection,
} from "./artTools";
import { withPaste } from "./pasteTool";
import { createDoorTool, createRoomTool, createStationTool } from "./placeTools";
import { withRoomResize } from "./resizeTool";
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
  if (workspace === "hull") return withPaste(withGibDirection(tool, context), context);
  if (workspace === "rooms") return withPaste(tool, context);
  return tool;
}

function createPlainTool(id: ToolId, context: ToolContext, workspace: WorkspaceId): CanvasTool {
  if (id === "select") {
    const select = createSelectTool(context);
    return workspace === "rooms" ? withRoomResize(select, context) : select;
  }
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
): { tool: CanvasTool; overlay: Overlay | null; cursor: string | null } {
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const tool = useMemo(
    () =>
      createTool(
        id,
        {
          texts,
          setOverlay: (next) => setOverlay((old) => (sameOverlay(old, next) ? old : next)),
          setGesture: setGestureCancel,
          say: (text) => useEditor.getState().setNotice({ kind: "info", text }),
          setCursor,
        },
        workspace
      ),
    [id, workspace, texts]
  );
  useEffect(
    () => () => {
      tool.cancel();
      setOverlay(null);
      setCursor(null);
    },
    [tool]
  );
  return { tool, overlay, cursor };
}
