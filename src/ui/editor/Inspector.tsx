/** The inspector: settings of the current workspace and the selection. */
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { ArtInspector } from "./art/ArtInspector";
import { DetailsInspector } from "./details/DetailsInspector";
import { LoadoutInspector } from "./loadout/LoadoutInspector";
import { RoomsInspector } from "./RoomsInspector";

const PANELS = {
  rooms: RoomsInspector,
  hull: ArtInspector,
  loadout: LoadoutInspector,
  hangar: DetailsInspector,
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
