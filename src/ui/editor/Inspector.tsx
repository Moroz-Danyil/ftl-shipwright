/** The inspector: settings of the current workspace and the selection. */
import { useEditor } from "../../app/store";
import { inspectorTarget } from "../../app/tour";
import { useTexts } from "../../text";
import { ArtInspector } from "./art/ArtInspector";
import { RoomsInspector } from "./RoomsInspector";
import { ShipInspector } from "./ship/ShipInspector";

const PANELS = {
  ship: ShipInspector,
  rooms: RoomsInspector,
  hull: ArtInspector,
};

export function Inspector() {
  const texts = useTexts();
  const workspace = useEditor((s) => s.workspace);
  const Panel = PANELS[workspace];
  return (
    <aside
      className="ed-inspector"
      aria-label={texts.inspector.label}
      data-tour={inspectorTarget(workspace)}
    >
      <Panel />
    </aside>
  );
}
