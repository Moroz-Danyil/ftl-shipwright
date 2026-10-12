/** The Layout inspector: the selected room's or door's values (read only for now). */
import { doorRooms, type Door, type Room, type Ship } from "../../core";
import { systemName } from "../../app/names";
import { useEditor } from "../../app/store";
import { doorKind } from "../../canvas/doors";
import { useTexts } from "../../text";

function ValueField({ label, value }: { label: string; value: number | string }) {
  return (
    <label className="field">
      {label}
      <input className="input mono" value={value} readOnly />
    </label>
  );
}

function RoomValues({ ship, room }: { ship: Ship; room: Room }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const names = ship.blueprint.systems
    .filter((s) => s.room === room.id)
    .map((s) => {
      const name = systemName(data, s.system);
      return s.start === false ? texts.inspector.boughtLater(name) : name;
    });
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
        <ValueField label={texts.inspector.x} value={room.x} />
        <ValueField label={texts.inspector.y} value={room.y} />
        <ValueField label={texts.inspector.width} value={room.w} />
        <ValueField label={texts.inspector.height} value={room.h} />
      </div>
      <div className="ed-group">
        <span className="eyebrow">{texts.inspector.inThisRoom}</span>
        {names.length > 0 ? (
          names.map((name, i) => <span key={i}>{name}</span>)
        ) : (
          <span>{texts.inspector.noSystem}</span>
        )}
      </div>
    </>
  );
}

function DoorValues({ ship, door, index }: { ship: Ship; door: Door; index: number }) {
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
        <ValueField label={texts.inspector.x} value={door.x} />
        <ValueField label={texts.inspector.y} value={door.y} />
        <ValueField
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

function ToolHelp() {
  const texts = useTexts();
  return (
    <div className="ed-help">
      {texts.inspector.toolHelp.map((item) => (
        <div key={item.title} className="ed-help">
          <span className="ed-help-title">{item.title}</span>
          <span>{item.body}</span>
        </div>
      ))}
    </div>
  );
}

export function LayoutInspector() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present);
  const selection = useEditor((s) => s.selection);
  if (!ship) return null;
  const room =
    selection?.kind === "room" ? ship.layout.rooms.find((r) => r.id === selection.id) : undefined;
  const doorIndex = selection?.kind === "door" ? selection.index : -1;
  const door = ship.layout.doors[doorIndex];
  return (
    <>
      {room && <RoomValues ship={ship} room={room} />}
      {door && <DoorValues ship={ship} door={door} index={doorIndex} />}
      {!room && !door && (
        <div className="ed-heading">
          <span className="eyebrow">{texts.inspector.nothingSelected}</span>
          <span className="muted">{texts.inspector.nothingSelectedHint}</span>
        </div>
      )}
      <ToolHelp />
    </>
  );
}
