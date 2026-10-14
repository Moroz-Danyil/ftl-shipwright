/**
 * The layers the canvas draws: the Layers menu's choice, with the rules of
 * Hull on top. In Hull the hull, floor, shield and mounts are always drawn
 * and the gibs follow their layer; the Gib tool draws only the hull and the
 * gibs.
 * The menu's choice itself never changes.
 */
import { LAYERS, type LayerId } from "../app/store";
import type { ToolId, WorkspaceId } from "../app/workspaces";

const ONLY_HULL_AND_GIBS = Object.fromEntries(
  LAYERS.map((layer) => [layer, layer === "hull" || layer === "gibs"])
) as Record<LayerId, boolean>;

export function shownLayers(
  layers: Record<LayerId, boolean>,
  workspace: WorkspaceId,
  tool: ToolId
): Record<LayerId, boolean> {
  if (workspace !== "hull") return layers;
  if (tool === "gib") return ONLY_HULL_AND_GIBS;
  return { ...layers, hull: true, floor: true, shield: true, mounts: true };
}
