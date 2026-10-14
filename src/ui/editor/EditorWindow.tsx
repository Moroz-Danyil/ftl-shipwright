/**
 * The editor: top bar, inspector on the left, the canvas (with the tool bar
 * over it), status bar; the hangar preview over all of it while it is open.
 */
import { useEditor } from "../../app/store";
import { HangarPreview } from "../../canvas/hangar/HangarPreview";
import { ShipCanvas } from "../../canvas/ShipCanvas";
import { PicturePicker } from "./art/PicturePicker";
import { Inspector } from "./Inspector";
import { OverviewDialog } from "./Overview";
import { SaveDialog } from "./SaveDialog";
import { StatusBar } from "./StatusBar";
import { DragChip } from "./systems/DragChip";
import { TopBar } from "./TopBar";

export function EditorWindow() {
  const dialog = useEditor((s) => s.dialog);
  const preview = useEditor((s) => s.view.hangarPreview);
  return (
    <div className="ed-window">
      <TopBar />
      <div className="ed-body">
        <Inspector />
        <ShipCanvas />
      </div>
      <StatusBar />
      {dialog === "save" && <SaveDialog />}
      {dialog === "overview" && <OverviewDialog />}
      {dialog === "picture" && <PicturePicker />}
      <DragChip />
      {preview && <HangarPreview />}
    </div>
  );
}
