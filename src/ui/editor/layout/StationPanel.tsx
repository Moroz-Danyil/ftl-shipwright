/** The selected crew station: its system, cell and facing, which can be turned. */
import type { Ship } from "../../../core";
import { turnStation } from "../../../app/layoutActions";
import { DIRECTIONS, stationOf } from "../../../app/layout/stations";
import { systemName } from "../../../app/names";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { SystemName } from "../../common/SystemIcon";

export function StationPanel({ ship, system }: { ship: Ship; system: number }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const station = stationOf(ship, system);
  if (!station) return null;
  const name = systemName(data, ship.blueprint.systems[system].system);
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.selectedStation}</span>
        <span className="ed-heading-title">
          <SystemName
            system={ship.blueprint.systems[system].system}
            name={texts.inspector.station(name)}
          />
        </span>
      </div>
      <div className="ed-row">
        <span className="muted">{texts.inspector.room(station.room.id)}</span>
        <span>
          {texts.inspector.stationCell} <span className="mono">{station.slot.number}</span>
        </span>
      </div>
      <div className="ed-group">
        <span className="eyebrow">{texts.inspector.facing}</span>
        <div className="ed-directions" role="group" aria-label={texts.inspector.facing}>
          {DIRECTIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={station.slot.direction === d ? "btn btn--on" : "btn"}
              aria-pressed={station.slot.direction === d}
              onClick={() => turnStation(system, d)}
            >
              {texts.inspector.directions[d]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
