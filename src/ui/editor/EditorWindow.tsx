/** The editor: top bar, inspector on the left, canvas, tool rail on the right, status bar. */
import { useEditor } from "../../app/store";
import { ShipCanvas } from "../../canvas/ShipCanvas";
import { PicturePicker } from "./art/PicturePicker";
import { ChecksDialog } from "./ChecksButton";
import { Inspector } from "./Inspector";
import { SaveDialog } from "./SaveDialog";
import { StatusBar } from "./StatusBar";
import { DragChip } from "./systems/DragChip";
import { ToolRail } from "./ToolRail";
import { TopBar } from "./TopBar";

export function EditorWindow() {
  const dialog = useEditor((s) => s.dialog);
  return (
    <div className="ed-window">
      <TopBar />
      <div className="ed-body">
        <Inspector />
        <ShipCanvas />
        <ToolRail />
      </div>
      <StatusBar />
      {dialog === "save" && <SaveDialog />}
      {dialog === "checks" && <ChecksDialog />}
      {dialog === "picture" && <PicturePicker />}
      <DragChip />
    </div>
  );
}
