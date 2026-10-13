/**
 * The ship's hull and reactor, and its starting crew: a row for each race
 * with its amount and remove, and "Add race…" while there is room.
 */
import type { Ship } from "../../../core";
import { setCrewAmount, setShipHull, setShipReactor } from "../../../app/loadoutActions";
import { gameText } from "../../../app/loadout/catalog";
import { LIMITS, NEW_SHIP_HULL, crewTotal } from "../../../app/details/rules";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { Help } from "../../common/Help";
import { Section } from "../../common/Section";
import { CrossIcon } from "../../common/icons";
import { NumberField } from "../../common/NumberField";
import { Stepper } from "../../common/Stepper";
import { RaceName, RacePicker } from "./RacePicker";

export function HullReactor({ ship }: { ship: Ship }) {
  const texts = useTexts();
  return (
    <Section id="loadout-hull" title={texts.sections.hullReactor}>
      <Help topic="hull">
        <Stepper
          label={texts.loadout.hull}
          value={ship.blueprint.health ?? NEW_SHIP_HULL}
          min={LIMITS.hull.min}
          max={LIMITS.hull.max}
          onChange={setShipHull}
        />
      </Help>
      <Help topic="reactor">
        <Stepper
          label={texts.loadout.reactor}
          value={ship.blueprint.maxPower ?? LIMITS.reactor.min}
          min={LIMITS.reactor.min}
          max={LIMITS.reactor.max}
          onChange={setShipReactor}
        />
      </Help>
    </Section>
  );
}

export function Crew({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const total = crewTotal(ship);
  const crew = ship.blueprint.crew;
  const races = data?.catalogs.races ?? [];
  const title = (race: string) => gameText(data, races.find((r) => r.name === race)?.title) || race;
  const missing = races.filter((r) => !crew.some((c) => c.race === r.name));
  return (
    <Section
      id="loadout-crew"
      title={texts.sections.crew}
      count={texts.sections.count(total, LIMITS.crew)}
    >
      {crew.length === 0 && <span className="muted">{texts.crew.noCrew}</span>}
      {crew.map((c) => (
        <div key={c.race} className="cr-crew" role="group" aria-label={title(c.race)}>
          <RaceName race={c.race} title={title(c.race)} />
          <Help topic="crewAmount">
            <NumberField
              label={texts.crew.amount}
              ariaLabel={texts.crew.amountOf(title(c.race))}
              value={c.amount}
              onCommit={(n) => setCrewAmount(c.race, n)}
            />
          </Help>
          <button
            type="button"
            className="btn btn--icon btn--small"
            aria-label={texts.crew.removeRace(title(c.race))}
            onClick={() => setCrewAmount(c.race, 0)}
          >
            <CrossIcon />
          </button>
        </div>
      ))}
      {total < LIMITS.crew && missing.length > 0 && <RacePicker races={missing} />}
    </Section>
  );
}
