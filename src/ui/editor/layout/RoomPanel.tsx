/**
 * The selected room in Rooms: a heading with the room and its systems, the
 * systems' cards, the palette to add more, position and size, and Delete.
 */
import { useState } from "react";
import type { Rect, Room, Ship } from "../../../core";
import { changeRoomValues, problemText } from "../../../app/layoutActions";
import { doorsOfRoom } from "../../../app/layout/doors";
import { useSystemName } from "../../../app/names";
import { useTexts } from "../../../text";
import { Help } from "../../common/Help";
import { NumberField } from "../../common/NumberField";
import { Section } from "../../common/Section";
import { AddSystem } from "../systems/Palette";
import { RoomSystems } from "../systems/RoomSystems";
import { DeleteButton } from "./DeleteButton";

function useSystemNames(ship: Ship, room: Room): string[] {
  const texts = useTexts();
  const nameOf = useSystemName();
  return ship.blueprint.systems
    .filter((s) => s.room === room.id)
    .map((s) =>
      s.start === false ? texts.inspector.boughtLater(nameOf(s.system)) : nameOf(s.system)
    );
}

function Position({ ship, room }: { ship: Ship; room: Room }) {
  const texts = useTexts();
  const [message, setMessage] = useState<string>();
  const doors = doorsOfRoom(ship.layout, room.id).length;
  const apply = (patch: Partial<Rect>) => {
    const problem = changeRoomValues(room.id, patch);
    setMessage(problem && problemText(texts, problem));
  };
  return (
    <Section id="room-position" title={texts.sections.position}>
      <div className="ed-grid2">
        <Help topic="roomPosition">
          <NumberField label={texts.inspector.x} value={room.x} onCommit={(x) => apply({ x })} />
        </Help>
        <Help topic="roomPosition">
          <NumberField label={texts.inspector.y} value={room.y} onCommit={(y) => apply({ y })} />
        </Help>
        <Help topic="roomSize">
          <NumberField
            label={texts.inspector.width}
            value={room.w}
            onCommit={(w) => apply({ w })}
          />
        </Help>
        <Help topic="roomSize">
          <NumberField
            label={texts.inspector.height}
            value={room.h}
            onCommit={(h) => apply({ h })}
          />
        </Help>
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
    </Section>
  );
}

export function RoomPanel({ ship, room }: { ship: Ship; room: Room }) {
  const texts = useTexts();
  const names = useSystemNames(ship, room);
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
      <RoomSystems ship={ship} room={room} />
      <AddSystem hint={texts.systems.helpRoom} />
      <Position key={room.id} ship={ship} room={room} />
      <DeleteButton />
    </>
  );
}
