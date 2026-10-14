/**
 * The Rooms inspector: with nothing selected, the palette of systems; for a
 * selected room, its systems, the palette, position and size; for a door, a
 * station or several things, their panel. Help for the current tool comes
 * next and Delete (for any selection) last; with the Station tool the choice
 * of which station it places comes first.
 */
import { selectionSize, singleTarget } from "../../app/selection";
import { currentTool, useEditor } from "../../app/store";
import type { Ship } from "../../core";
import { useTexts } from "../../text";
import { DeleteButton } from "./layout/DeleteButton";
import { DoorPanel } from "./layout/DoorPanel";
import { RoomPanel } from "./layout/RoomPanel";
import { StationPanel } from "./layout/StationPanel";
import { StationChooser, ToolHelp } from "./layout/ToolHelp";
import { AddSystem } from "./systems/Palette";

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
    </>
  );
}

function NothingSelected() {
  const texts = useTexts();
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.nothingSelected}</span>
        <span className="ed-heading-title">{texts.inspector.rooms.title}</span>
      </div>
      <AddSystem hint={texts.systems.help} />
    </>
  );
}

function SelectionPanel({ ship }: { ship: Ship }) {
  const selection = useEditor((s) => s.selection);
  const size = selectionSize(selection);
  if (size === 0) return <NothingSelected />;
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
  if (target.kind === "station") return <StationPanel ship={ship} system={target.system} />;
  return null;
}

export function RoomsInspector() {
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const tool = useEditor(currentTool);
  const selected = useEditor((s) => selectionSize(s.selection) > 0);
  if (!ship) return null;
  return (
    <>
      {tool === "station" && <StationChooser ship={ship} />}
      <SelectionPanel ship={ship} />
      <ToolHelp />
      {selected && <DeleteButton />}
    </>
  );
}
