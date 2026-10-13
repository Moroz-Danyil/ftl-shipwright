/**
 * Rooms and doors, drawn over the pictures. Each layer only
 * redraws when its ship part or selection changes.
 */
import { memo } from "react";
import { roomRectPx, type ShipLayout } from "../core";
import { doorKind, doorRectPx } from "./doors";

interface RoomsProps {
  layout: ShipLayout;
  /** Ids of the selected rooms. */
  selected: number[];
  showIds: boolean;
}

export const Rooms = memo(function Rooms({ layout, selected, showIds }: RoomsProps) {
  return (
    <g>
      {layout.rooms.map((room, i) => {
        const r = roomRectPx(layout, room);
        const isSelected = selected.includes(room.id);
        return (
          <g key={i} data-testid={`room-${room.id}`} data-selected={isSelected || undefined}>
            <rect
              className={isSelected ? "cv-room cv-room--selected" : "cv-room"}
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
});

interface DoorsProps {
  layout: ShipLayout;
  /** Indices of the selected doors. */
  selected: number[];
}

export const Doors = memo(function Doors({ layout, selected }: DoorsProps) {
  return (
    <g>
      {layout.doors.map((door, index) => {
        const r = doorRectPx(layout, door);
        const kind = doorKind(layout, door);
        const isSelected = selected.includes(index);
        return (
          <g
            key={index}
            data-testid={`door-${index}`}
            data-kind={kind}
            data-selected={isSelected || undefined}
          >
            {isSelected && (
              <rect
                className="cv-selection-ring"
                x={r.x - 3}
                y={r.y - 3}
                width={r.w + 6}
                height={r.h + 6}
                rx={3}
                vectorEffect="non-scaling-stroke"
              />
            )}
            <rect
              className={`cv-door cv-door--${kind}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={2}
            />
          </g>
        );
      })}
    </g>
  );
});
