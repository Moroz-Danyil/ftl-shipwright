/**
 * What each command does. Keys and buttons both end up here.
 */
import type { Platform } from "../platform/types";
import type { Texts } from "../text";
import type { CommandId } from "./keys";
import { saveShipMod } from "./saveMod";
import { useEditor } from "./store";
import type { ToolId, WorkspaceId } from "./workspaces";

export interface CommandContext {
  platform: Platform;
  texts: Texts;
}

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
  else if (command === "cancel") state.select(null);
  else if (command.startsWith("workspace."))
    state.setWorkspace(command.slice("workspace.".length) as WorkspaceId);
  else if (command.startsWith("tool.")) state.setTool(command.slice("tool.".length) as ToolId);
  else return false;
  return true;
}
