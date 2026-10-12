/** The selected room: position and size (editable), id, systems and doors. */
import { useState } from "react";
import type { Rect, Room, Ship } from "../../../core";
import { changeRoomValues, problemText } from "../../../app/layoutActions";
import { doorsOfRoom } from "../../../app/layout/doors";
import { isStationSystem } from "../../../app/layout/stations";
import { systemName } from "../../../app/names";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { NumberField } from "../../common/NumberField";
import { DeleteButton } from "./DeleteButton";

function useSystemNames(ship: Ship, room: Room): string[] {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  return ship.blueprint.systems
    .filter((s) => s.room === room.id)
    .map((s) => {
      const name = systemName(data, s.system);
      return s.start === false ? texts.inspector.boughtLater(name) : name;
    });
}

/** Cell numbers that medbay and clonebay keep (read only here). */
function useKeptCells(ship: Ship, room: Room): string[] {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  return ship.blueprint.systems
    .filter((s) => s.room === room.id && !isStationSystem(s.system) && s.slot?.number !== undefined)
    .map((s) => texts.inspector.crewCell(systemName(data, s.system), s.slot!.number!));
}

export function RoomPanel({ ship, room }: { ship: Ship; room: Room }) {
  const texts = useTexts();
  const [message, setMessage] = useState<string>();
  const names = useSystemNames(ship, room);
  const kept = useKeptCells(ship, room);
  const doors = doorsOfRoom(ship.layout, room.id).length;

  const apply = (patch: Partial<Rect>) => {
    const problem = changeRoomValues(room.id, patch);
    setMessage(problem && problemText(texts, problem));
  };

  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.selectedRoom}</span>
        <span className="ed-heading-title">
          {names.length > 0
            ? texts.inspector.roomWith(room.id, names.join(", "))
            : texts.inspector.room(room.id)}
        </span>
      </div>
      <div className="ed-grid2">
        <NumberField label={texts.inspector.x} value={room.x} onCommit={(x) => apply({ x })} />
        <NumberField label={texts.inspector.y} value={room.y} onCommit={(y) => apply({ y })} />
        <NumberField label={texts.inspector.width} value={room.w} onCommit={(w) => apply({ w })} />
        <NumberField label={texts.inspector.height} value={room.h} onCommit={(h) => apply({ h })} />
      </div>
      {message && (
        <div className="ed-group ed-group--problem" role="alert">
          {message}
        </div>
      )}
      <div className="ed-row muted">
        <span>
          {texts.inspector.roomId} <span className="mono">{room.id}</span>
        </span>
        <span>{texts.inspector.doorsOnWalls(doors)}</span>
      </div>
      <div className="ed-group">
        <span className="eyebrow">{texts.inspector.inThisRoom}</span>
        {names.length > 0 ? (
          names.map((name, i) => <span key={i}>{name}</span>)
        ) : (
          <span>{texts.inspector.noSystem}</span>
        )}
        {kept.map((line, i) => (
          <span key={i} className="muted">
            {line}
          </span>
        ))}
        <button
          type="button"
          className="link ed-link"
          onClick={() => useEditor.getState().setWorkspace("systems")}
        >
          {texts.inspector.changeInSystems}
        </button>
      </div>
      <DeleteButton />
    </>
  );
}
