/** The editor: top bar, tool rail, canvas, inspector and status bar. */
import { useEditor } from "../../app/store";
import { ShipCanvas } from "../../canvas/ShipCanvas";
import { ChecksDialog } from "./ChecksButton";
import { Inspector } from "./Inspector";
import { SaveDialog } from "./SaveDialog";
import { StatusBar } from "./StatusBar";
import { ToolRail } from "./ToolRail";
import { TopBar } from "./TopBar";

export function EditorWindow() {
  const dialog = useEditor((s) => s.dialog);
  return (
    <div className="ed-window">
      <TopBar />
      <div className="ed-body">
        <ToolRail />
        <ShipCanvas />
        <Inspector />
      </div>
      <StatusBar />
      {dialog === "save" && <SaveDialog />}
      {dialog === "checks" && <ChecksDialog />}
    </div>
  );
}
