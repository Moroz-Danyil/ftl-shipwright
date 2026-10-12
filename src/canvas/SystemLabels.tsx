/**
 * Labels of the systems in each room (Systems workspace): blue for systems
 * installed at the start, amber for systems bought later.
 */
import { memo } from "react";
import { roomRectPx, type Ship, type ShipLayout, type ShipSystem } from "../core";
import { useEditor } from "../app/store";
import { isInstalled } from "../app/systems/rules";

const LABEL_HEIGHT = 12;
const LABEL_GAP = 2;
/** Rough width of one character of the label font (ship pixels). */
const CHAR_WIDTH = 4.6;

interface Props {
  layout: ShipLayout;
  systems: ShipSystem[];
  /** The display name of a system. */
  nameOf: (system: string) => string;
}

export const SystemLabels = memo(function SystemLabels({ layout, systems, nameOf }: Props) {
  return (
    <g className="cv-system-labels">
      {layout.rooms.map((room) => {
        const inRoom = systems.filter((s) => s.room === room.id);
        if (inRoom.length === 0) return null;
        const r = roomRectPx(layout, room);
        const total = inRoom.length * LABEL_HEIGHT + (inRoom.length - 1) * LABEL_GAP;
        const first = r.y + r.h / 2 - total / 2;
        return (
          <g key={room.id} data-testid={`system-labels-${room.id}`}>
            {inRoom.map((s, i) => {
              const name = nameOf(s.system);
              const wanted = name.length * CHAR_WIDTH + 8;
              const width = Math.min(r.w - 4, wanted);
              const top = first + i * (LABEL_HEIGHT + LABEL_GAP);
              const later = !isInstalled(s);
              return (
                <g
                  key={s.system}
                  className={later ? "cv-system-label cv-system-label--later" : "cv-system-label"}
                  data-system={s.system}
                  data-later={later || undefined}
                >
                  <rect
                    x={r.x + r.w / 2 - width / 2}
                    y={top}
                    width={width}
                    height={LABEL_HEIGHT}
                    rx={3}
                  />
                  <text
                    x={r.x + r.w / 2}
                    y={top + LABEL_HEIGHT / 2}
                    dy="0.35em"
                    textAnchor="middle"
                    textLength={wanted > width ? width - 6 : undefined}
                    lengthAdjust="spacingAndGlyphs"
                  >
                    {name}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
});

/** The room a dragged system chip would land in: amber, or red when the system is already there. */
export function SystemDropTarget({ ship }: { ship: Ship }) {
  const drag = useEditor((s) => s.systemDrag);
  if (!drag || drag.room === null) return null;
  const room = ship.layout.rooms.find((r) => r.id === drag.room);
  if (!room) return null;
  const r = roomRectPx(ship.layout, room);
  const already = ship.blueprint.systems.some(
    (s) => s.system === drag.system && s.room === room.id
  );
  return (
    <rect
      className={already ? "cv-ghost cv-ghost--bad" : "cv-ghost"}
      data-testid="system-drop"
      data-ok={!already}
      x={r.x}
      y={r.y}
      width={r.w}
      height={r.h}
      vectorEffect="non-scaling-stroke"
    />
  );
}
