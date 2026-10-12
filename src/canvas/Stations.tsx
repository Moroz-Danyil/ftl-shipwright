/**
 * Crew stations: a small crew figure in the station cell with a line towards
 * the direction the crew member faces.
 */
import { memo } from "react";
import type { Ship } from "../core";
import { stationOf, stationSystemIndices } from "../app/layout/stations";
import { STATION_RADIUS, stationCentre } from "./hitTest";

const FACING: Record<string, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

interface Props {
  ship: Ship;
  /** System indices of the selected stations. */
  selected: number[];
}

function StationsLayer({ ship, selected }: Props) {
  return (
    <g>
      {stationSystemIndices(ship).map((system) => {
        const c = stationCentre(ship, system);
        const station = stationOf(ship, system);
        if (!c || !station) return null;
        const [fx, fy] = FACING[station.slot.direction ?? ""] ?? [0, 0];
        const isSelected = selected.includes(system);
        return (
          <g
            key={system}
            className={isSelected ? "cv-station cv-station--selected" : "cv-station"}
            data-testid={`station-${system}`}
            data-direction={station.slot.direction}
            data-selected={isSelected || undefined}
          >
            <circle className="cv-station-ring" cx={c.x} cy={c.y} r={STATION_RADIUS} />
            {(fx !== 0 || fy !== 0) && (
              <line
                className="cv-station-facing"
                x1={c.x}
                y1={c.y}
                x2={c.x + fx * (STATION_RADIUS + 5)}
                y2={c.y + fy * (STATION_RADIUS + 5)}
              />
            )}
            <circle className="cv-station-figure" cx={c.x} cy={c.y - 4} r={3} />
            <path
              className="cv-station-figure"
              d={`M${c.x - 5} ${c.y + 6}Q${c.x} ${c.y - 4} ${c.x + 5} ${c.y + 6}Z`}
            />
          </g>
        );
      })}
    </g>
  );
}

/** Redraws only when the layout, the systems or the selection change. */
export const Stations = memo(
  StationsLayer,
  (a, b) =>
    a.selected === b.selected &&
    a.ship.layout === b.ship.layout &&
    a.ship.blueprint.systems === b.ship.blueprint.systems
);
