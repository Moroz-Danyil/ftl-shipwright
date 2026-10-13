/** What each tool does, by workspace: shown beside the tool rail and in the inspector. */
import type { ToolId, WorkspaceId } from "../../app/workspaces";
import type { Texts } from "../../text";

export interface ToolHelpText {
  title: string;
  body: string;
}

/** What a tool of a workspace does, if the texts say. */
export function toolHelpOf(
  texts: Texts,
  workspace: WorkspaceId,
  tool: ToolId
): ToolHelpText | undefined {
  const table: Partial<Record<ToolId, ToolHelpText>> = texts.toolHelp[workspace];
  return table[tool];
}
