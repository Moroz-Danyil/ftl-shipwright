/** The inspector: settings of the current workspace and the selection. */
import { useEditor } from "../../app/store";
import type { WorkspaceId } from "../../app/workspaces";
import { useTexts } from "../../text";
import { LayoutInspector } from "./LayoutInspector";
import { SystemsInspector } from "./systems/SystemsInspector";

function WorkspaceSummary({
  workspace,
}: {
  workspace: Exclude<WorkspaceId, "layout" | "systems">;
}) {
  const texts = useTexts();
  const info = texts.inspector[workspace];
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{info.eyebrow}</span>
        <span className="ed-heading-title">{info.title}</span>
      </div>
      <span className="ed-help">{info.body}</span>
      <div className="ed-group">
        <span className="muted">{texts.inspector.comingSoon}</span>
      </div>
    </>
  );
}

export function Inspector() {
  const texts = useTexts();
  const workspace = useEditor((s) => s.workspace);
  return (
    <aside className="ed-inspector" aria-label={texts.inspector.label}>
      {workspace === "layout" ? (
        <LayoutInspector />
      ) : workspace === "systems" ? (
        <SystemsInspector />
      ) : (
        <WorkspaceSummary workspace={workspace} />
      )}
    </aside>
  );
}
