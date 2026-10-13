/**
 * The Details inspector: name, class and description as the hangar shows
 * them, the save name, hull, reactor and the starting crew.
 */
import type { Ship } from "../../../core";
import {
  renameShip,
  setCrewAmount,
  setShipHull,
  setShipReactor,
  setShipText,
} from "../../../app/loadoutActions";
import { gameText } from "../../../app/loadout/catalog";
import {
  LIMITS,
  NEW_SHIP_HULL,
  crewTotal,
  type TextField as Field,
} from "../../../app/details/rules";
import { useEditor } from "../../../app/store";
import { usePlatform } from "../../../platform/PlatformContext";
import { useTexts } from "../../../text";
import { Help } from "../../common/Help";
import { Section } from "../../common/Section";
import { CrossIcon } from "../../common/icons";
import { NumberField } from "../../common/NumberField";
import { Stepper } from "../../common/Stepper";
import { TextField } from "../../common/TextField";
import { RaceName, RacePicker } from "./RacePicker";

function HangarTexts({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const value = (field: Field) => gameText(data, ship.blueprint.texts[field]) ?? "";
  return (
    <Section id="details-hangar" title={texts.sections.hangar}>
      <Help topic="shipName">
        <TextField
          label={texts.details.name}
          value={value("name")}
          onCommit={(v) => setShipText("name", v)}
        />
      </Help>
      <Help topic="shipClass">
        <TextField
          label={texts.details.class}
          value={value("class")}
          onCommit={(v) => setShipText("class", v)}
        />
      </Help>
      <Help topic="shipDescription">
        <TextField
          label={texts.details.description}
          value={value("desc")}
          multiline
          onCommit={(v) => setShipText("desc", v)}
        />
      </Help>
    </Section>
  );
}

function SaveName({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const platform = usePlatform();
  return (
    <Section id="details-save" title={texts.details.saveName}>
      <Help topic="blueprintName">
        <TextField
          label={texts.details.blueprintName}
          className="input mono"
          value={ship.blueprint.name}
          onCommit={(name) => renameShip(platform, texts, { name })}
        />
      </Help>
      <Help topic="baseName">
        <TextField
          label={texts.details.baseName}
          className="input mono"
          value={ship.blueprint.layout}
          onCommit={(base) => renameShip(platform, texts, { base })}
        />
      </Help>
    </Section>
  );
}

function Crew({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const total = crewTotal(ship);
  const crew = ship.blueprint.crew;
  const races = data?.catalogs.races ?? [];
  const title = (race: string) => gameText(data, races.find((r) => r.name === race)?.title) || race;
  const missing = races.filter((r) => !crew.some((c) => c.race === r.name));
  return (
    <Section
      id="details-crew"
      title={texts.sections.crew}
      count={texts.sections.count(total, LIMITS.crew)}
    >
      {crew.length === 0 && <span className="muted">{texts.details.noCrew}</span>}
      {crew.map((c) => (
        <div key={c.race} className="dt-crew" role="group" aria-label={title(c.race)}>
          <RaceName race={c.race} title={title(c.race)} />
          <Help topic="crewAmount">
            <NumberField
              label={texts.details.amount}
              ariaLabel={texts.details.amountOf(title(c.race))}
              value={c.amount}
              onCommit={(n) => setCrewAmount(c.race, n)}
            />
          </Help>
          <button
            type="button"
            className="btn btn--icon btn--small"
            aria-label={texts.details.removeRace(title(c.race))}
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

export function DetailsInspector() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present.ship);
  if (!ship) return null;
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.details.eyebrow}</span>
        <span className="ed-heading-title">{texts.inspector.details.title}</span>
      </div>
      <HangarTexts ship={ship} />
      <SaveName ship={ship} />
      <Section id="details-hull" title={texts.sections.hullReactor}>
        <Help topic="hull">
          <Stepper
            label={texts.details.hull}
            value={ship.blueprint.health ?? NEW_SHIP_HULL}
            min={LIMITS.hull.min}
            max={LIMITS.hull.max}
            onChange={setShipHull}
          />
        </Help>
        <Help topic="reactor">
          <Stepper
            label={texts.details.reactor}
            value={ship.blueprint.maxPower ?? LIMITS.reactor.min}
            min={LIMITS.reactor.min}
            max={LIMITS.reactor.max}
            onChange={setShipReactor}
          />
        </Help>
      </Section>
      <Crew ship={ship} />
    </>
  );
}
