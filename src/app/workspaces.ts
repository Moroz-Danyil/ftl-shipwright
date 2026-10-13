/**
 * The three workspaces: the ship itself, its rooms and its hull, and the
 * tools each one offers.
 */

export const WORKSPACES = ["ship", "rooms", "hull"] as const;
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

export const WORKSPACE_TOOLS: Record<WorkspaceId, ToolId[]> = {
  ship: ["select"],
  rooms: ["select", "room", "door", "station"],
  hull: ["select", "movePicture", "mount", "gib"],
};

/** The key of a workspace: its position, 1 to 3. */
export function workspaceKey(id: WorkspaceId): string {
  return String(WORKSPACES.indexOf(id) + 1);
}

export function hasTool(workspace: WorkspaceId, tool: ToolId): boolean {
  return WORKSPACE_TOOLS[workspace].includes(tool);
}
