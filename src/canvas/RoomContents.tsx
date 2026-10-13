/**
 * What the game draws inside rooms: each system's interior picture at the
 * room's top-left corner, and the systems' icons centred in the room (side by
 * side when a room holds several; tinted amber when bought later). Also the
 * room a dragged system chip would land in.
 */
import { memo } from "react";
import { roomRectPx, type FileSource, type Ship } from "../core";
import { interiorPath } from "../app/systems/interiors";
import { useEditor } from "../app/store";
import { ROOM_ICON_SIZE, roomIcons, systemIconPath } from "./gameLook";
import { usePicture } from "./pictures";

/** The filter that tints the icon of a system bought later (defined once in the scene). */
export const LATER_TINT_ID = "cv-later-tint";

function Interior({
  source,
  name,
  x,
  y,
}: {
  source: FileSource;
  name: string;
  x: number;
  y: number;
}) {
  const picture = usePicture(source, interiorPath(name));
  if (!picture) return null;
  return (
    <image
      className="cv-interior"
      data-testid={`interior-${name}`}
      href={picture.url}
      x={x}
      y={y}
      width={picture.width}
      height={picture.height}
    />
  );
}

export const Interiors = memo(function Interiors({
  ship,
  source,
}: {
  ship: Ship;
  source: FileSource;
}) {
  return (
    <g>
      {ship.blueprint.systems.map((s, i) => {
        const room = ship.layout.rooms.find((r) => r.id === s.room);
        if (!room || !s.img) return null;
        const r = roomRectPx(ship.layout, room);
        return <Interior key={i} source={source} name={s.img} x={r.x} y={r.y} />;
      })}
    </g>
  );
});

function Icon({ system, later, x, y }: { system: string; later: boolean; x: number; y: number }) {
  const view = useEditor((s) => s.game.data?.view);
  const picture = usePicture(view, systemIconPath(system));
  if (!picture) return null;
  return (
    <image
      className={later ? "cv-system-icon cv-system-icon--later" : "cv-system-icon"}
      data-testid={`system-icon-${system}`}
      data-later={later || undefined}
      href={picture.url}
      x={x}
      y={y}
      width={ROOM_ICON_SIZE}
      height={ROOM_ICON_SIZE}
      filter={later ? `url(#${LATER_TINT_ID})` : undefined}
    />
  );
}

export const SystemIcons = memo(function SystemIcons({ ship }: { ship: Ship }) {
  return (
    <g>
      {ship.layout.rooms.map((room) => (
        <g key={room.id} data-testid={`system-icons-${room.id}`}>
          {roomIcons(ship, room.id, roomRectPx(ship.layout, room)).map((icon) => (
            <Icon key={icon.system} {...icon} />
          ))}
        </g>
      ))}
    </g>
  );
});

/** Amber, multiplied into a white icon: the tint of systems bought later. */
export function LaterTint() {
  return (
    <filter id={LATER_TINT_ID}>
      <feColorMatrix type="matrix" values="0.95 0 0 0 0  0 0.66 0 0 0  0 0 0.23 0 0  0 0 0 0.9 0" />
    </filter>
  );
}

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
