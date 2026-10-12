/**
 * Rooms, doors and weapon mounts, drawn over the pictures.
 */
import { doorSegmentPx, mountPositionPx, roomRectPx, type Ship } from "../core";
import type { Selection } from "../app/store";
import { doorKind } from "./doors";

const DOOR_LENGTH = 16;
const DOOR_THICKNESS = 6;
const MOUNT_RADIUS = 11;

export function Rooms({
  ship,
  selection,
  showIds,
}: {
  ship: Ship;
  selection: Selection | null;
  showIds: boolean;
}) {
  const layout = ship.layout;
  return (
    <g>
      {layout.rooms.map((room, i) => {
        const r = roomRectPx(layout, room);
        const selected = selection?.kind === "room" && selection.id === room.id;
        return (
          <g key={i} data-testid={`room-${room.id}`} data-selected={selected || undefined}>
            <rect
              className={selected ? "cv-room cv-room--selected" : "cv-room"}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              vectorEffect="non-scaling-stroke"
            />
            {showIds && (
              <text className="cv-room-id" x={r.x + 3} y={r.y + 11}>
                {room.id}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export function Doors({ ship, selection }: { ship: Ship; selection: Selection | null }) {
  const layout = ship.layout;
  return (
    <g>
      {layout.doors.map((door, index) => {
        const s = doorSegmentPx(layout, door);
        const cx = (s.x1 + s.x2) / 2;
        const cy = (s.y1 + s.y2) / 2;
        const w = door.vertical ? DOOR_THICKNESS : DOOR_LENGTH;
        const h = door.vertical ? DOOR_LENGTH : DOOR_THICKNESS;
        const kind = doorKind(layout, door);
        const selected = selection?.kind === "door" && selection.index === index;
        return (
          <g
            key={index}
            data-testid={`door-${index}`}
            data-kind={kind}
            data-selected={selected || undefined}
          >
            {selected && (
              <rect
                className="cv-selection-ring"
                x={cx - w / 2 - 3}
                y={cy - h / 2 - 3}
                width={w + 6}
                height={h + 6}
                rx={3}
                vectorEffect="non-scaling-stroke"
              />
            )}
            <rect
              className={`cv-door cv-door--${kind}`}
              x={cx - w / 2}
              y={cy - h / 2}
              width={w}
              height={h}
              rx={2}
            />
          </g>
        );
      })}
    </g>
  );
}

export function Mounts({ ship }: { ship: Ship }) {
  const { layout, layoutXml } = ship;
  return (
    <g>
      {layoutXml.mounts.map((mount, i) => {
        const p = mountPositionPx(layout, layoutXml, mount);
        return (
          <g key={i} className="cv-mount" data-testid={`mount-${i + 1}`}>
            <circle cx={p.x} cy={p.y} r={MOUNT_RADIUS} />
            <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle">
              {i + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
}
