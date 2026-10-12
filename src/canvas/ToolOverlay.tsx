/**
 * What the current tool draws over the ship: the hover outline, the
 * selection box, ghost rooms (red when refused), the wall under the Door tool
 * and the cell under the Station tool.
 */
import { CELL_SIZE, cellToPx, roomRectPx, type Rect, type Ship } from "../core";
import type { Target } from "../app/selection";
import { doorRectPx } from "./doors";
import { STATION_RADIUS, stationCentre } from "./hitTest";
import type { Overlay } from "./tools/types";

function Hover({ ship, target }: { ship: Ship; target: Target }) {
  const layout = ship.layout;
  let shape: Rect | undefined;
  if (target.kind === "room") {
    const room = layout.rooms.find((r) => r.id === target.id);
    shape = room && roomRectPx(layout, room);
  } else if (target.kind === "door") {
    const door = layout.doors[target.index];
    const r = door && doorRectPx(layout, door);
    shape = r && { x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 };
  } else {
    const c = stationCentre(ship, target.system);
    if (c)
      return (
        <circle
          className="cv-hover"
          cx={c.x}
          cy={c.y}
          r={STATION_RADIUS + 2}
          vectorEffect="non-scaling-stroke"
        />
      );
  }
  if (!shape) return null;
  return (
    <rect
      className="cv-hover"
      data-testid="hover"
      x={shape.x}
      y={shape.y}
      width={shape.w}
      height={shape.h}
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function ToolOverlay({ ship, overlay }: { ship: Ship; overlay: Overlay | null }) {
  if (!overlay) return null;
  const layout = ship.layout;
  switch (overlay.kind) {
    case "hover":
      return <Hover ship={ship} target={overlay.target} />;
    case "box":
      return (
        <rect
          className="cv-box"
          data-testid="selection-box"
          x={overlay.rect.x}
          y={overlay.rect.y}
          width={overlay.rect.w}
          height={overlay.rect.h}
          vectorEffect="non-scaling-stroke"
        />
      );
    case "ghost":
      return (
        <g data-testid="ghost" data-ok={overlay.ok}>
          {overlay.cells.map((cells, i) => {
            const r = roomRectPx(layout, cells);
            return (
              <rect
                key={i}
                className={overlay.ok ? "cv-ghost" : "cv-ghost cv-ghost--bad"}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>
      );
    case "wall": {
      const r = doorRectPx(layout, overlay.wall);
      return (
        <rect
          className={overlay.exists ? "cv-wall cv-wall--taken" : "cv-wall"}
          data-testid="wall"
          x={r.x - 2}
          y={r.y - 2}
          width={r.w + 4}
          height={r.h + 4}
          rx={2}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    case "cell": {
      const p = cellToPx(layout, overlay.cell.x, overlay.cell.y);
      return (
        <rect
          className={overlay.ok ? "cv-ghost" : "cv-ghost cv-ghost--bad"}
          data-testid="cell"
          x={p.x}
          y={p.y}
          width={CELL_SIZE}
          height={CELL_SIZE}
          vectorEffect="non-scaling-stroke"
        />
      );
    }
  }
}
