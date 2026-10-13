/**
 * What each command does. Keys and buttons both end up here.
 */
import type { Platform } from "../platform/types";
import type { Texts } from "../text";
import { cancelGesture } from "./gesture";
import type { CommandId, MoveDirection } from "./keys";
import { deleteSelectedArt, nudgeArt, turnSelectedMounts } from "./artActions";
import { deleteSelected, nudgeSelection } from "./layoutActions";
import { saveShipMod } from "./saveMod";
import { EMPTY_SELECTION } from "./selection";
import { useEditor } from "./store";
import type { ToolId, WorkspaceId } from "./workspaces";

export interface CommandContext {
  platform: Platform;
  texts: Texts;
}

const STEPS: Record<MoveDirection, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/** Saves to the last target, or asks where to save when there is none yet. */
export function saveCommand(context: CommandContext): void {
  const { doc, openDialog } = useEditor.getState();
  if (!doc) return;
  if (doc.saveTarget) void saveShipMod(context.platform, context.texts, doc.saveTarget);
  else openDialog("save");
}

/** Runs a command; returns false when it does not apply right now. */
export function runCommand(command: CommandId, context: CommandContext): boolean {
  const state = useEditor.getState();
  if (!state.doc) return false;
  if (command === "undo") state.undo();
  else if (command === "redo") state.redo();
  else if (command === "save") saveCommand(context);
  else if (command === "cancel") {
    if (!cancelGesture()) state.select(EMPTY_SELECTION);
  } else if (command === "delete") {
    if (state.workspace === "art") return deleteSelectedArt();
    if (state.workspace !== "layout") return false;
    void deleteSelected(context);
  } else if (command.startsWith("move.") || command.startsWith("moveFar.")) {
    const far = command.startsWith("moveFar.");
    const [dx, dy] = STEPS[command.slice(command.indexOf(".") + 1) as MoveDirection];
    if (state.workspace === "art") return nudgeArt(dx * (far ? 10 : 1), dy * (far ? 10 : 1));
    if (state.workspace !== "layout") return false;
    return nudgeSelection(dx, dy, context.texts);
  } else if (command === "mount.rotate" || command === "mount.mirror") {
    if (state.workspace !== "art") return false;
    return turnSelectedMounts(command === "mount.rotate" ? "rotate" : "mirror");
  } else if (command.startsWith("workspace."))
    state.setWorkspace(command.slice("workspace.".length) as WorkspaceId);
  else if (command.startsWith("tool.")) state.setTool(command.slice("tool.".length) as ToolId);
  else return false;
  return true;
}
