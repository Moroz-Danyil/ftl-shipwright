/**
 * Crew at their stations, as the game draws them: the ship's first crew race
 * manning the console, facing the station's direction. Without the game's
 * pictures a small round marker stands in. A selected station gets an amber
 * ring.
 */
import { memo } from "react";
import { CELL_SIZE, type Animations, type Ship } from "../core";
import { stationOf, stationSystemIndices } from "../app/layout/stations";
import { crewRace, stationCrewFrame } from "./gameLook";
import { STATION_RADIUS, stationCentre } from "./hitTest";
import { SheetSprite } from "./SheetSprite";

interface Props {
  ship: Ship;
  animations: Animations | undefined;
  /** System indices of the selected stations. */
  selected: number[];
  /** Hide the selection rings (hangar preview). */
  plain: boolean;
}

function StationsLayer({ ship, animations, selected, plain }: Props) {
  const race = crewRace(ship);
  return (
    <g>
      {stationSystemIndices(ship).map((system) => {
        const c = stationCentre(ship, system);
        const station = stationOf(ship, system);
        if (!c || !station) return null;
        const frame = animations && stationCrewFrame(animations, race, station.slot.direction);
        const isSelected = selected.includes(system) && !plain;
        return (
          <g
            key={system}
            className="cv-station"
            data-testid={`station-${system}`}
            data-direction={station.slot.direction}
            data-selected={isSelected || undefined}
          >
            {frame ? (
              <SheetSprite
                path={frame.path}
                frame={frame.rect}
                x={c.x - CELL_SIZE / 2}
                y={c.y - CELL_SIZE / 2}
              />
            ) : (
              <circle className="cv-station-marker" cx={c.x} cy={c.y} r={STATION_RADIUS / 2} />
            )}
            {isSelected && (
              <circle
                className="cv-selection-ring"
                cx={c.x}
                cy={c.y}
                r={STATION_RADIUS + 2}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Redraws only when the layout, the systems, the crew or the selection change. */
export const Stations = memo(
  StationsLayer,
  (a, b) =>
    a.selected === b.selected &&
    a.plain === b.plain &&
    a.animations === b.animations &&
    a.ship.layout === b.ship.layout &&
    a.ship.blueprint.systems === b.ship.blueprint.systems &&
    a.ship.blueprint.crew === b.ship.blueprint.crew
);
