/**
 * The guided tour of the editor: its steps, the part of the window each one
 * points at, the keys its texts name and where its card goes.
 *
 * A step's part of the window is every element with its `data-tour` value.
 * When none of them is on screen and the step names a workspace, the tour
 * switches to that workspace, which shows it.
 */
import { bindingsOf, keyLabel, type CommandId, type KeyMap } from "./keys";
import { WORKSPACES, WORKSPACE_TOOLS, type ToolId, type WorkspaceId } from "./workspaces";

export type TourStepId =
  | "workspaces"
  | "shipInspector"
  | "roomsInspector"
  | "hullInspector"
  | "tools"
  | "canvas"
  | "slots"
  | "view"
  | "undo"
  | "overview"
  | "settings";

export interface TourStep {
  id: TourStepId;
  /** The `data-tour` value of the elements the step points at. */
  target: string;
  /** The workspace that shows the elements, switched to when they are not on screen. */
  workspace?: WorkspaceId;
}

/** The `data-tour` value of each workspace's inspector. */
export const inspectorTarget = (workspace: WorkspaceId) => `inspector-${workspace}`;

export const TOUR_STEPS: TourStep[] = [
  { id: "workspaces", target: "workspaces" },
  { id: "shipInspector", target: inspectorTarget("ship"), workspace: "ship" },
  { id: "roomsInspector", target: inspectorTarget("rooms"), workspace: "rooms" },
  { id: "hullInspector", target: inspectorTarget("hull"), workspace: "hull" },
  { id: "tools", target: "tools" },
  { id: "canvas", target: "canvas" },
  { id: "slots", target: "slots", workspace: "ship" },
  { id: "view", target: "view" },
  { id: "undo", target: "undo" },
  { id: "overview", target: "overview" },
  { id: "settings", target: "settings" },
];

/** The keys the tour's texts name, as the interface shows them (`Ctrl+Z`, `Space`). */
export interface TourKeys {
  workspace: Record<WorkspaceId, string>;
  tool: Record<ToolId, string>;
  undo: string[];
  redo: string[];
  pan: string[];
  delete: string[];
}

/** The keys of the current bindings that the tour's texts name. */
export function tourKeys(map: KeyMap): TourKeys {
  const bindings = bindingsOf(map);
  const of = (command: CommandId) =>
    bindings.filter((b) => b.command === command).map((b) => keyLabel(b.keys));
  const tools = [...new Set(WORKSPACES.flatMap((w) => WORKSPACE_TOOLS[w]))];
  return {
    workspace: Object.fromEntries(
      WORKSPACES.map((w) => [w, of(`workspace.${w}`)[0] ?? ""])
    ) as Record<WorkspaceId, string>,
    tool: Object.fromEntries(tools.map((t) => [t, of(`tool.${t}`)[0] ?? ""])) as Record<
      ToolId,
      string
    >,
    undo: of("undo"),
    redo: of("redo"),
    pan: of("pan"),
    delete: of("delete"),
  };
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Space between the highlighted part and the card. */
const CARD_GAP = 14;
/** The card keeps this far from the window's edges. */
const WINDOW_MARGIN = 12;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, Math.max(min, max)));

/**
 * Where the card goes (its top left corner): next to the highlighted part on
 * the first side it fits on (below, right, above, left), inside the window
 * and not over the part; on the side with the most room when it fits on none;
 * in the middle of the window when nothing is highlighted.
 */
export function placeCard(target: Box | null, card: Size, area: Size): { x: number; y: number } {
  const maxX = area.width - WINDOW_MARGIN - card.width;
  const maxY = area.height - WINDOW_MARGIN - card.height;
  if (!target) {
    return {
      x: Math.max(WINDOW_MARGIN, (area.width - card.width) / 2),
      y: Math.max(WINDOW_MARGIN, (area.height - card.height) / 2),
    };
  }
  const centreX = clamp(target.x + target.width / 2 - card.width / 2, WINDOW_MARGIN, maxX);
  const centreY = clamp(target.y + target.height / 2 - card.height / 2, WINDOW_MARGIN, maxY);
  const sides = [
    {
      room: area.height - (target.y + target.height) - CARD_GAP - WINDOW_MARGIN - card.height,
      at: { x: centreX, y: target.y + target.height + CARD_GAP },
    },
    {
      room: area.width - (target.x + target.width) - CARD_GAP - WINDOW_MARGIN - card.width,
      at: { x: target.x + target.width + CARD_GAP, y: centreY },
    },
    {
      room: target.y - CARD_GAP - WINDOW_MARGIN - card.height,
      at: { x: centreX, y: target.y - CARD_GAP - card.height },
    },
    {
      room: target.x - CARD_GAP - WINDOW_MARGIN - card.width,
      at: { x: target.x - CARD_GAP - card.width, y: centreY },
    },
  ];
  const side =
    sides.find((s) => s.room >= 0) ?? sides.reduce((best, s) => (s.room > best.room ? s : best));
  return {
    x: clamp(side.at.x, WINDOW_MARGIN, maxX),
    y: clamp(side.at.y, WINDOW_MARGIN, maxY),
  };
}
