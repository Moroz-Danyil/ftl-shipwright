/**
 * Help for the current Layout tool, and for the Station tool the choice of
 * which system's station it places.
 */
import { stationSystemIndices } from "../../../app/layout/stations";
import { systemName } from "../../../app/names";
import { currentTool, useEditor } from "../../../app/store";
import type { Ship } from "../../../core";
import { useTexts } from "../../../text";

export function ToolHelp() {
  const texts = useTexts();
  const tool = useEditor(currentTool);
  const help = texts.inspector.toolHelp[tool as keyof typeof texts.inspector.toolHelp];
  if (!help) return null;
  return (
    <div className="ed-help">
      <span className="ed-help-title">{help.title}</span>
      <span>{help.body}</span>
    </div>
  );
}

export function StationChooser({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const chosen = useEditor((s) => s.stationSystem);
  const setChosen = useEditor((s) => s.setStationSystem);
  const systems = stationSystemIndices(ship);
  if (systems.length === 0)
    return <div className="ed-group">{texts.inspector.noStationSystems}</div>;
  const current = chosen !== null && systems.includes(chosen) ? chosen : systems[0];
  return (
    <fieldset className="ed-group ed-fieldset">
      <legend className="eyebrow">{texts.inspector.stationFor}</legend>
      {systems.map((i) => {
        const s = ship.blueprint.systems[i];
        return (
          <label key={i} className="ed-choice">
            <input
              type="radio"
              name="station-system"
              checked={i === current}
              onChange={() => setChosen(i)}
            />
            {texts.inspector.stationChoice(systemName(data, s.system), s.room)}
          </label>
        );
      })}
    </fieldset>
  );
}
