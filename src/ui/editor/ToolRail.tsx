/** The tools of the current workspace, each with its key. */
import { currentTool, useEditor } from "../../app/store";
import { TOOL_GLYPHS, TOOL_KEYS, WORKSPACE_TOOLS } from "../../app/workspaces";
import { useTexts } from "../../text";

export function ToolRail() {
  const texts = useTexts();
  const workspace = useEditor((s) => s.workspace);
  const tool = useEditor(currentTool);
  const setTool = useEditor((s) => s.setTool);
  return (
    <aside className="ed-rail" aria-label={texts.toolRail.label}>
      {WORKSPACE_TOOLS[workspace].map((id) => (
        <button
          key={id}
          type="button"
          className="ed-tool"
          aria-label={texts.tools[id]}
          aria-pressed={id === tool}
          title={texts.toolRail.tool(texts.tools[id], TOOL_KEYS[id])}
          onClick={() => setTool(id)}
        >
          <span className="ed-tool-glyph">{TOOL_GLYPHS[id]}</span>
          <span className="ed-tool-key">{TOOL_KEYS[id]}</span>
        </button>
      ))}
    </aside>
  );
}
