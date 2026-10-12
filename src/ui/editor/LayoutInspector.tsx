/**
 * The Layout inspector: the selected room, door or station, a count for
 * several things, and help for the current tool.
 */
import { selectionSize, singleTarget } from "../../app/selection";
import { currentTool, useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { DeleteButton } from "./layout/DeleteButton";
import { DoorPanel } from "./layout/DoorPanel";
import { RoomPanel } from "./layout/RoomPanel";
import { StationPanel } from "./layout/StationPanel";
import { StationChooser, ToolHelp } from "./layout/ToolHelp";

function Several() {
  const texts = useTexts();
  const selection = useEditor((s) => s.selection);
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.several}</span>
        <span className="ed-heading-title">
          {texts.inspector.severalTitle(selectionSize(selection))}
        </span>
        <span className="muted">
          {texts.inspector.severalParts(
            selection.rooms.length,
            selection.doors.length,
            selection.stations.length
          )}
        </span>
      </div>
      <DeleteButton />
    </>
  );
}

function SelectionPanel() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present);
  const selection = useEditor((s) => s.selection);
  if (!ship) return null;
  const size = selectionSize(selection);
  if (size === 0)
    return (
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.nothingSelected}</span>
      </div>
    );
  if (size > 1) return <Several />;
  const target = singleTarget(selection)!;
  if (target.kind === "room") {
    const room = ship.layout.rooms.find((r) => r.id === target.id);
    return room ? <RoomPanel key={room.id} ship={ship} room={room} /> : null;
  }
  if (target.kind === "door") {
    const door = ship.layout.doors[target.index];
    return door ? <DoorPanel ship={ship} door={door} index={target.index} /> : null;
  }
  return <StationPanel ship={ship} system={target.system} />;
}

export function LayoutInspector() {
  const ship = useEditor((s) => s.doc?.history.present);
  const tool = useEditor(currentTool);
  if (!ship) return null;
  return (
    <>
      {tool === "station" && <StationChooser ship={ship} />}
      <SelectionPanel />
      <ToolHelp />
    </>
  );
}
