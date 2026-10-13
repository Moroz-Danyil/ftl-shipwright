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
import { RacePicture } from "../../common/ItemPictures";
import { Stepper } from "../../common/Stepper";
import { TextField } from "../../common/TextField";
import { RaceCards } from "./RaceCards";

function HangarTexts({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const value = (field: Field) => gameText(data, ship.blueprint.texts[field]) ?? "";
  return (
    <>
      <TextField
        label={texts.details.name}
        value={value("name")}
        onCommit={(v) => setShipText("name", v)}
      />
      <TextField
        label={texts.details.class}
        value={value("class")}
        onCommit={(v) => setShipText("class", v)}
      />
      <TextField
        label={texts.details.description}
        value={value("desc")}
        multiline
        onCommit={(v) => setShipText("desc", v)}
      />
    </>
  );
}

function SaveName({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const platform = usePlatform();
  return (
    <fieldset className="ed-group ed-fieldset">
      <legend className="eyebrow">{texts.details.saveName}</legend>
      <TextField
        label={texts.details.blueprintName}
        className="input mono"
        value={ship.blueprint.name}
        onCommit={(name) => renameShip(platform, texts, { name })}
      />
      <TextField
        label={texts.details.baseName}
        className="input mono"
        value={ship.blueprint.layout}
        onCommit={(base) => renameShip(platform, texts, { base })}
      />
    </fieldset>
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
    <section className="ed-group" aria-label={texts.details.crew(total)}>
      <span className="eyebrow">{texts.details.crew(total)}</span>
      {crew.length === 0 && <span className="muted">{texts.details.noCrew}</span>}
      {crew.map((c) => (
        <div key={c.race} className="dt-crew">
          <RacePicture race={c.race} />
          <Stepper
            label={title(c.race)}
            value={c.amount}
            min={0}
            max={c.amount + LIMITS.crew - total}
            showMax={false}
            onChange={(n) => setCrewAmount(c.race, n)}
          />
        </div>
      ))}
      {total < LIMITS.crew && missing.length > 0 && <RaceCards races={missing} />}
    </section>
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
      <div className="ed-group">
        <Stepper
          label={texts.details.hull}
          value={ship.blueprint.health ?? NEW_SHIP_HULL}
          min={LIMITS.hull.min}
          max={LIMITS.hull.max}
          onChange={setShipHull}
        />
        <Stepper
          label={texts.details.reactor}
          value={ship.blueprint.maxPower ?? LIMITS.reactor.min}
          min={LIMITS.reactor.min}
          max={LIMITS.reactor.max}
          onChange={setShipReactor}
        />
      </div>
      <Crew ship={ship} />
    </>
  );
}
