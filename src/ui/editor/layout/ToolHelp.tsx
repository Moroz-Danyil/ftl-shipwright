/**
 * Help for the current tool (Rooms or Hull), folded by default, and
 * for the Station tool the choice of which system's station it places.
 */
import { stationSystemIndices } from "../../../app/layout/stations";
import { systemName } from "../../../app/names";
import { currentTool, useEditor } from "../../../app/store";
import type { Ship } from "../../../core";
import { useTexts } from "../../../text";
import { Section } from "../../common/Section";
import { SystemName } from "../../common/SystemIcon";
import { toolHelpOf } from "../toolHelp";

export function ToolHelp() {
  const texts = useTexts();
  const tool = useEditor(currentTool);
  const workspace = useEditor((s) => s.workspace);
  const help = toolHelpOf(texts, workspace, tool);
  if (!help) return null;
  return (
    <Section id="tool-help" title={help.title} defaultOpen={false}>
      <span className="ed-help">{help.body}</span>
    </Section>
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
            <SystemName
              system={s.system}
              name={texts.inspector.stationChoice(systemName(data, s.system), s.room)}
            />
          </label>
        );
      })}
    </fieldset>
  );
}
