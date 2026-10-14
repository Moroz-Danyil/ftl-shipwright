/** What each tool does, by workspace: shown under the tool bar and in the inspector. */
import type { ToolId, WorkspaceId } from "../../app/workspaces";
import type { Texts } from "../../text";

export interface ToolHelpText {
  title: string;
  body: string;
}

/** What a tool of a workspace does, if the texts say; the title names the tool's current key. */
export function toolHelpOf(
  texts: Texts,
  workspace: WorkspaceId,
  tool: ToolId,
  key: string
): ToolHelpText | undefined {
  const table: Partial<Record<ToolId, ToolHelpText>> = texts.toolHelp[workspace];
  const help = table[tool];
  return help && { title: texts.common.withKey(help.title, key), body: help.body };
}
