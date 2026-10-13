/**
 * Rooms and doors as the game draws them: light grey tiled floors with thick
 * walls, and the game's door sprite on each door. Editing marks stay on top:
 * the amber selection, room numbers, and blue (airlock) or red (loose)
 * outlines around doors. Each layer only redraws when its ship part or
 * selection changes.
 */
import { memo } from "react";
import { CELL_SIZE, roomRectPx, type Rect, type ShipLayout } from "../core";
import { doorKind, doorRectPx } from "./doors";
import { CLOSED_DOOR_FRAME, DOOR_SHEET, doorSpriteTransform } from "./gameLook";
import { SheetSprite } from "./SheetSprite";

/** The thin lines between the 35 px floor tiles of a room. */
function tileLines(r: Rect): string {
  const parts: string[] = [];
  for (let x = r.x + CELL_SIZE; x < r.x + r.w; x += CELL_SIZE)
    parts.push(`M${x} ${r.y}V${r.y + r.h}`);
  for (let y = r.y + CELL_SIZE; y < r.y + r.h; y += CELL_SIZE)
    parts.push(`M${r.x} ${y}H${r.x + r.w}`);
  return parts.join("");
}

interface RoomsProps {
  layout: ShipLayout;
  /** Ids of the selected rooms. */
  selected: number[];
  /** Which room numbers to show: all of them, or only the selected rooms'. */
  ids: "all" | "selected" | "none";
}

export const Rooms = memo(function Rooms({ layout, selected, ids }: RoomsProps) {
  return (
    <g>
      {layout.rooms.map((room, i) => {
        const r = roomRectPx(layout, room);
        const isSelected = selected.includes(room.id);
        const showId = ids === "all" || (ids === "selected" && isSelected);
        return (
          <g key={i} data-testid={`room-${room.id}`} data-selected={isSelected || undefined}>
            <rect className="cv-room" x={r.x} y={r.y} width={r.w} height={r.h} />
            <path className="cv-room-tiles" d={tileLines(r)} />
            <rect className="cv-room-wall" x={r.x} y={r.y} width={r.w} height={r.h} />
            {isSelected && (
              <rect
                className="cv-room-selected"
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {showId && (
              <text className="cv-room-id" x={r.x + 3} y={r.y + 9}>
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
  /** Hide the airlock and loose-door marks (hangar preview). */
  plain: boolean;
}

export const Doors = memo(function Doors({ layout, selected, plain }: DoorsProps) {
  return (
    <g>
      {layout.doors.map((door, index) => {
        const r = doorRectPx(layout, door);
        const kind = doorKind(layout, door);
        const isSelected = selected.includes(index);
        const marked = !plain && kind !== "inner";
        return (
          <g
            key={index}
            data-testid={`door-${index}`}
            data-kind={kind}
            data-selected={isSelected || undefined}
          >
            <SheetSprite
              path={DOOR_SHEET.path}
              frame={CLOSED_DOOR_FRAME}
              transform={doorSpriteTransform(layout, door)}
              className="cv-door-sprite"
            />
            {(marked || isSelected) && (
              <rect
                className={isSelected ? "cv-selection-ring" : `cv-door-mark cv-door-mark--${kind}`}
                x={r.x - 3}
                y={r.y - 3}
                width={r.w + 6}
                height={r.h + 6}
                rx={3}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        );
      })}
    </g>
  );
});
