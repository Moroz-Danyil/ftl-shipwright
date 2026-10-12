/**
 * The five workspaces and the tools each one offers.
 */

export const WORKSPACES = ["layout", "systems", "art", "loadout", "details"] as const;
export type WorkspaceId = (typeof WORKSPACES)[number];

export type ToolId = "select" | "room" | "door" | "station" | "movePicture" | "mount" | "gib";

/** The default key of each tool (also its shortcut). */
export const TOOL_KEYS: Record<ToolId, string> = {
  select: "V",
  room: "R",
  door: "D",
  station: "T",
  movePicture: "H",
  mount: "M",
  gib: "G",
};

/** The letter drawn on each tool's button. */
export const TOOL_GLYPHS: Record<ToolId, string> = {
  select: "S",
  room: "R",
  door: "D",
  station: "P",
  movePicture: "H",
  mount: "M",
  gib: "G",
};

export const WORKSPACE_TOOLS: Record<WorkspaceId, ToolId[]> = {
  layout: ["select", "room", "door", "station"],
  systems: ["select", "station"],
  art: ["select", "movePicture", "mount", "gib"],
  loadout: ["select"],
  details: ["select"],
};

/** The key of a workspace: its position, 1 to 5. */
export function workspaceKey(id: WorkspaceId): string {
  return String(WORKSPACES.indexOf(id) + 1);
}

export function hasTool(workspace: WorkspaceId, tool: ToolId): boolean {
  return WORKSPACE_TOOLS[workspace].includes(tool);
}
