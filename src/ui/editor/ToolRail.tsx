/**
 * The tools of the current workspace: each with its icon, name and key.
 * Hovering or focusing a tool shows what it does left of the rail.
 */
import { keyLabel } from "../../app/keys";
import { currentTool, useEditor } from "../../app/store";
import { WORKSPACE_TOOLS, type ToolId } from "../../app/workspaces";
import { useTexts } from "../../text";
import { HoverPanel } from "../common/HoverPanel";
import { ToolIcon } from "../common/icons";
import { useHoverPanel } from "../common/useHoverPanel";
import { toolHelpOf } from "./toolHelp";

export function ToolRail() {
  const texts = useTexts();
  const workspace = useEditor((s) => s.workspace);
  const tool = useEditor(currentTool);
  const setTool = useEditor((s) => s.setTool);
  const keys = useEditor((s) => s.keys);
  const panel = useHoverPanel<ToolId>();
  const keyOfTool = (id: ToolId) => keyLabel(keys[`tool.${id}`]);
  const help =
    panel.shown && toolHelpOf(texts, workspace, panel.shown.value, keyOfTool(panel.shown.value));
  return (
    <aside className="ed-rail" aria-label={texts.toolRail.label}>
      {WORKSPACE_TOOLS[workspace].map((id) => (
        <button
          key={id}
          type="button"
          className="ed-tool"
          aria-label={texts.tools[id]}
          aria-pressed={id === tool}
          onClick={() => setTool(id)}
          onPointerEnter={(e) => panel.show(id, e.currentTarget)}
          onPointerLeave={panel.hide}
          onFocus={(e) => panel.show(id, e.currentTarget)}
          onBlur={panel.hide}
        >
          <ToolIcon tool={id} />
          <span className="ed-tool-name">{texts.tools[id]}</span>
          <span className="ed-tool-key">{keyOfTool(id)}</span>
        </button>
      ))}
      {panel.shown && help && (
        <HoverPanel anchor={panel.shown.anchor}>
          <section className="lo-details" aria-label={help.title}>
            <span className="lo-details-title">{help.title}</span>
            <p className="lo-details-text muted">{help.body}</p>
          </section>
        </HoverPanel>
      )}
    </aside>
  );
}
