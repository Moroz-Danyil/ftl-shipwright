/** The selected door: position, orientation, the two sides and warnings. */
import { doorRooms, type Door, type Ship } from "../../../core";
import { doorKind } from "../../../canvas/doors";
import { useTexts } from "../../../text";

function Value({ label, value }: { label: string; value: string | number }) {
  return (
    <label className="field">
      {label}
      <input className="input mono" value={value} readOnly />
    </label>
  );
}

export function DoorPanel({ ship, door, index }: { ship: Ship; door: Door; index: number }) {
  const texts = useTexts();
  const kind = doorKind(ship.layout, door);
  const [a, b] = doorRooms(ship.layout, door);
  const side = (id: number) => (id === -1 ? texts.inspector.space : texts.inspector.side(id));
  const room = ship.layout.rooms.find((r) => r.id === a);
  const large = kind === "airlock" && room !== undefined && (room.w > 2 || room.h > 2);
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.selectedDoor}</span>
        <span className="ed-heading-title">{texts.inspector.door(index)}</span>
      </div>
      <div className="ed-grid2">
        <Value label={texts.inspector.x} value={door.x} />
        <Value label={texts.inspector.y} value={door.y} />
        <Value
          label={texts.inspector.wall}
          value={door.vertical ? texts.inspector.verticalWall : texts.inspector.horizontalWall}
        />
      </div>
      {kind !== "loose" && (
        <div className="ed-group">
          <span className="eyebrow">{texts.inspector.sides}</span>
          <span>
            {side(a)} · {side(b)}
          </span>
        </div>
      )}
      {kind === "airlock" && <span className="muted">{texts.inspector.airlock}</span>}
      {large && <div className="ed-group ed-group--warn">{texts.inspector.largeAirlock}</div>}
      {kind === "loose" && (
        <div className="ed-group ed-group--problem">{texts.inspector.loose}</div>
      )}
    </>
  );
}
