/**
 * The ship's info: name, class and description as the hangar shows them,
 * then the save name: the hangar slot the ship takes (its blueprint name)
 * and the names of its files, then the ship's place on the game's screen.
 */
import type { Ship } from "../../../core";
import { centreShipOnScreen } from "../../../app/layoutActions";
import { offCentrePx } from "../../../app/layout/screen";
import { renameShip, setShipText } from "../../../app/loadoutActions";
import { slotName, slotOf } from "../../../app/hangar";
import { gameText } from "../../../app/loadout/catalog";
import type { TextField as Field } from "../../../app/details/rules";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { HangarSlotPicker } from "../../common/HangarSlotPicker";
import { Help } from "../../common/Help";
import { Section, SubHeading } from "../../common/Section";
import { TextField } from "../../common/TextField";

export function Info({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const value = (field: Field) => gameText(data, ship.blueprint.texts[field]) ?? "";
  const slot = slotOf(ship.blueprint.name);
  return (
    <Section id="ship-info" title={texts.sections.info} icon="info">
      <Help topic="shipName">
        <TextField
          label={texts.hangar.name}
          value={value("name")}
          onCommit={(v) => setShipText("name", v)}
        />
      </Help>
      <Help topic="shipClass">
        <TextField
          label={texts.hangar.class}
          value={value("class")}
          onCommit={(v) => setShipText("class", v)}
        />
      </Help>
      <Help topic="shipDescription">
        <TextField
          label={texts.hangar.description}
          value={value("desc")}
          multiline
          onCommit={(v) => setShipText("desc", v)}
        />
      </Help>
      <SubHeading title={texts.hangar.saveName} icon="save">
        <Help topic="hangarSlot">
          <div className="field" role="group" aria-label={texts.hangarSlot.label}>
            {texts.hangarSlot.label}
            <HangarSlotPicker
              slot={slot}
              onPick={(next) => void renameShip(texts, { name: slotName(next) })}
            />
            {!slot && (
              <>
                <span className="hs-summary mono">
                  {texts.hangarSlot.ownName(ship.blueprint.name)}
                </span>
                <span className="hs-note">{texts.hangarSlot.ownNameHint}</span>
              </>
            )}
          </div>
        </Help>
        <Help topic="blueprintName">
          <TextField
            label={texts.hangar.blueprintName}
            className="input mono"
            value={ship.blueprint.name}
            onCommit={(name) => renameShip(texts, { name })}
          />
        </Help>
        <Help topic="baseName">
          <TextField
            label={texts.hangar.baseName}
            className="input mono"
            value={ship.blueprint.layout}
            onCommit={(base) => renameShip(texts, { base })}
          />
        </Help>
      </SubHeading>
      <ScreenPosition ship={ship} />
    </Section>
  );
}

/** How far the ship sits from where the game places its own ships, and Centre on screen. */
function ScreenPosition({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const off = offCentrePx(ship);
  const x = Math.round(off.x);
  const y = Math.round(off.y);
  // Within a pixel is as close as whole pixels allow.
  const centred = Math.abs(x) <= 1 && Math.abs(y) <= 1;
  return (
    <SubHeading title={texts.hangar.screen} icon="position">
      <Help topic="centreOnScreen">
        <button type="button" className="btn btn--small" onClick={centreShipOnScreen}>
          {texts.hangar.centre}
        </button>
      </Help>
      <span className="muted" data-testid="screen-position">
        {centred ? texts.hangar.centred : texts.hangar.offCentre(x, y)}
      </span>
    </SubHeading>
  );
}
