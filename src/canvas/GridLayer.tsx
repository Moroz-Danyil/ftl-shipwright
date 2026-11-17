/**
 * The game's 35 px grid and, for player ships, the dashed frame of what the
 * game shows.
 */
import { CELL_SIZE, type Rect, type Ship } from "../core";
import { isPlayerShip, viewLimitPx } from "./viewLimit";

/** Grid lines covering `area` (ship pixels); lines fall on multiples of the cell size. */
export function GridLines({ area }: { area: Rect }) {
  const x0 = Math.floor(area.x / CELL_SIZE) * CELL_SIZE;
  const y0 = Math.floor(area.y / CELL_SIZE) * CELL_SIZE;
  const x1 = area.x + area.w;
  const y1 = area.y + area.h;
  const lines: string[] = [];
  for (let x = x0; x <= x1; x += CELL_SIZE) lines.push(`M${x} ${y0}V${y1}`);
  for (let y = y0; y <= y1; y += CELL_SIZE) lines.push(`M${x0} ${y}H${x1}`);
  return <path className="cv-grid" d={lines.join("")} vectorEffect="non-scaling-stroke" />;
}

export function ViewLimitFrame({ ship }: { ship: Ship }) {
  if (!isPlayerShip(ship.blueprint.name)) return null;
  const r = viewLimitPx(ship.layout);
  return (
    <rect
      className="cv-view-limit"
      data-testid="view-limit"
      x={r.x}
      y={r.y}
      width={r.w}
      height={r.h}
      vectorEffect="non-scaling-stroke"
    />
  );
}
