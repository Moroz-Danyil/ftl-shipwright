/**
 * The races not yet in the crew, as cards like the Loadout ones. A click adds
 * one crew member; hovering or focusing a card shows the race's description
 * and abilities beside the inspector.
 */
import type { RaceCatalogEntry } from "../../../core";
import { setCrewAmount } from "../../../app/loadoutActions";
import { gameText } from "../../../app/loadout/catalog";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { HoverPanel } from "../../common/HoverPanel";
import { useHoverPanel } from "../../common/useHoverPanel";
import { RacePicture } from "../../common/ItemPictures";

function RaceDetails({ race }: { race: RaceCatalogEntry }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const title = gameText(data, race.title) || race.name;
  const desc = gameText(data, race.desc);
  const powers = race.powers.map((p) => gameText(data, p)).filter(Boolean);
  return (
    <section className="lo-details" aria-label={title}>
      <span className="lo-details-title">{title}</span>
      <span className="eyebrow mono">{race.name}</span>
      {desc && <p className="lo-details-text">{desc}</p>}
      {powers.length > 0 && (
        <>
          <span className="eyebrow">{texts.details.abilities}</span>
          <ul className="lo-details-text">
            {powers.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}
      {race.cost !== undefined && (
        <dl className="lo-stats">
          <div className="ed-row">
            <dt>{texts.loadout.details.cost}</dt>
            <dd className="mono">{texts.loadout.units.scrap(race.cost)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export function RaceCards({ races }: { races: RaceCatalogEntry[] }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const panel = useHoverPanel<RaceCatalogEntry>();
  return (
    <div className="field">
      <span>{texts.details.addRace}</span>
      <div className="lo-cards dt-races" onPointerLeave={panel.hide}>
        {races.map((race) => (
          <button
            key={race.name}
            type="button"
            className="lo-card"
            onClick={() => {
              panel.hide();
              setCrewAmount(race.name, 1);
            }}
            onPointerEnter={(e) => panel.show(race, e.currentTarget)}
            onFocus={(e) => panel.show(race, e.currentTarget)}
            onBlur={panel.hide}
          >
            <span className="lo-card-pic">
              <RacePicture race={race.name} />
            </span>
            <span className="lo-card-title">{gameText(data, race.title) || race.name}</span>
            {race.cost !== undefined && (
              <span className="lo-card-stats">{texts.loadout.units.scrap(race.cost)}</span>
            )}
          </button>
        ))}
      </div>
      <span className="ed-help">{texts.details.raceHint}</span>
      {panel.shown && (
        <HoverPanel
          anchor={panel.shown.anchor}
          picture={<RacePicture race={panel.shown.value.name} size={105} />}
        >
          <RaceDetails race={panel.shown.value} />
        </HoverPanel>
      )}
    </div>
  );
}
