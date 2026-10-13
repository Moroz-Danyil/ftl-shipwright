/** The inspector: settings of the current workspace and the selection. */
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { ArtInspector } from "./art/ArtInspector";
import { DetailsInspector } from "./details/DetailsInspector";
import { LayoutInspector } from "./LayoutInspector";
import { LoadoutInspector } from "./loadout/LoadoutInspector";
import { SystemsInspector } from "./systems/SystemsInspector";

const PANELS = {
  layout: LayoutInspector,
  systems: SystemsInspector,
  art: ArtInspector,
  loadout: LoadoutInspector,
  details: DetailsInspector,
};

export function Inspector() {
  const texts = useTexts();
  const workspace = useEditor((s) => s.workspace);
  const Panel = PANELS[workspace];
  return (
    <aside className="ed-inspector" aria-label={texts.inspector.label}>
      <Panel />
    </aside>
  );
}
