/**
 * The parts of a player ship's rooms outside the frame the game shows:
 * amber past its right or bottom edge (not visible in battle), red above or
 * left of it (the game may crash), with an outline round the whole room.
 */
import { roomRectPx, type Ship } from "../core";
import { roomsOffScreen, roomsOutOfView } from "../app/checks";
import { viewLimitPx } from "./viewLimit";

/** How far the "outside" shape reaches round the frame, in ship pixels. */
const FAR = 100000;

export function OffScreenRooms({ ship }: { ship: Ship }) {
  const off = roomsOffScreen(ship);
  const out = roomsOutOfView(ship);
  if (off.length + out.length === 0) return null;
  const frame = viewLimitPx(ship.layout);
  const left = frame.x;
  const top = frame.y;
  const right = frame.x + frame.w;
  const bottom = frame.y + frame.h;
  const outside = `M${-FAR} ${-FAR}H${FAR}V${FAR}H${-FAR}Z M${left} ${top}V${bottom}H${right}V${top}Z`;
  const rooms = (ids: number[], kind: "out" | "off") =>
    ship.layout.rooms
      .filter((r) => ids.includes(r.id))
      .map((r) => {
        const p = roomRectPx(ship.layout, r);
        return (
          <g key={r.id} data-testid={`room-${kind}-${r.id}`}>
            <rect
              className={`cv-room-${kind}-part`}
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              clipPath="url(#cv-outside-frame)"
            />
            <rect
              className={`cv-room-${kind}`}
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      });
  return (
    <g className="cv-off-screen" pointerEvents="none">
      <defs>
        <clipPath id="cv-outside-frame">
          <path d={outside} clipRule="evenodd" />
        </clipPath>
      </defs>
      {rooms(out, "out")}
      {rooms(off, "off")}
    </g>
  );
}
