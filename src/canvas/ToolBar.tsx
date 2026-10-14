/**
 * The tools of the current workspace in a row at the top of the canvas: each
 * with its icon, name and current key. Hovering or focusing a tool shows what
 * it does in a panel below the bar.
 */
import { keyLabel } from "../app/keys";
import { currentTool, useEditor } from "../app/store";
import { WORKSPACE_TOOLS, type ToolId } from "../app/workspaces";
import { useTexts } from "../text";
import { HoverPanel } from "../ui/common/HoverPanel";
import { ToolIcon } from "../ui/common/icons";
import { useHoverPanel } from "../ui/common/useHoverPanel";
import { toolHelpOf } from "../ui/editor/toolHelp";

export function ToolBar() {
  const texts = useTexts();
  const workspace = useEditor((s) => s.workspace);
  const tool = useEditor(currentTool);
  const keys = useEditor((s) => s.keys);
  const setTool = useEditor((s) => s.setTool);
  const panel = useHoverPanel<ToolId>();
  const keyOfTool = (id: ToolId) => keyLabel(keys[`tool.${id}`]);
  const help =
    panel.shown && toolHelpOf(texts, workspace, panel.shown.value, keyOfTool(panel.shown.value));
  return (
    <div
      className="cv-toolbar"
      role="group"
      aria-label={texts.toolBar.label}
      data-tour="tools"
      // The bar is not part of the drawing: a click on it must not reach the canvas tools.
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {WORKSPACE_TOOLS[workspace].map((id) => (
        <button
          key={id}
          type="button"
          className="cv-tool"
          aria-label={texts.tools[id]}
          aria-pressed={id === tool}
          onClick={() => setTool(id)}
          onPointerEnter={(e) => panel.show(id, e.currentTarget)}
          onPointerLeave={panel.hide}
          onFocus={(e) => panel.show(id, e.currentTarget)}
          onBlur={panel.hide}
        >
          <ToolIcon tool={id} />
          <span className="cv-tool-name">{texts.tools[id]}</span>
          <kbd className="cv-tool-key">{keyOfTool(id)}</kbd>
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
    </div>
  );
}
