/**
 * Draws the selected gib's direction fan (see `directionFan.ts`) in the accent
 * colour, with a dark edge under the lines so it reads on any picture and
 * in both themes.
 */
import type { Point, Range, Ship } from "../core";
import type { ShipArt } from "../app/art/model";
import { fanGeometry, fanPath, handlePoint, pointAt, type FanEnd } from "./directionFan";

/** Sizes in screen pixels. */
const HANDLE_RADIUS = 6;
const HEAD_LENGTH = 13;
const HEAD_HALF_WIDTH = 6;

interface Props {
  ship: Ship;
  art: ShipArt;
  index: number;
  direction: Range;
  scale: number;
}

const line = (a: Point, b: Point) => `M${a.x} ${a.y}L${b.x} ${b.y}`;

export function GibFan({ ship, art, index, direction, scale }: Props) {
  const fan = fanGeometry(ship, art, index, direction, scale);
  if (!fan) return null;
  const { centre, inner, outer } = fan;

  const edge = (end: FanEnd) => {
    const degrees = direction[end];
    const from = pointAt(centre, degrees, inner);
    const tip = handlePoint(fan, end);
    const head = HEAD_LENGTH / scale;
    const base = pointAt(centre, degrees, Math.max(inner, outer - head));
    const side = pointAt({ x: 0, y: 0 }, degrees + 90, HEAD_HALF_WIDTH / scale);
    const arrowHead = `M${tip.x} ${tip.y}L${base.x + side.x} ${base.y + side.y}L${base.x - side.x} ${base.y - side.y}Z`;
    return (
      <g key={end} className="cv-fan-edge" data-end={end}>
        <path className="cv-fan-under" d={line(centre, tip)} vectorEffect="non-scaling-stroke" />
        {inner > 0 && (
          <path className="cv-fan-base" d={line(centre, from)} vectorEffect="non-scaling-stroke" />
        )}
        <path className="cv-fan-arrow" d={line(from, tip)} vectorEffect="non-scaling-stroke" />
        <path className="cv-fan-head" d={arrowHead} vectorEffect="non-scaling-stroke" />
        <circle
          className="cv-fan-handle"
          data-testid={`gib-fan-${end}`}
          cx={tip.x}
          cy={tip.y}
          r={HANDLE_RADIUS / scale}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  };

  return (
    <g
      className="cv-fan"
      data-testid="gib-fan"
      data-gib={index + 1}
      data-min={direction.min}
      data-max={direction.max}
    >
      <path className="cv-fan-wedge" d={fanPath(fan, 0, outer)} fillRule="evenodd" />
      {inner > 0 && (
        <path className="cv-fan-band" d={fanPath(fan, inner, outer)} fillRule="evenodd" />
      )}
      {edge("min")}
      {edge("max")}
    </g>
  );
}
