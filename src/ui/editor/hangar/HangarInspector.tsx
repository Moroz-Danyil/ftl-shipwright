/**
 * The Hangar inspector: name, class and description as the hangar shows
 * them, and the save name (the names of the ship's files).
 */
import type { Ship } from "../../../core";
import { renameShip, setShipText } from "../../../app/loadoutActions";
import { gameText } from "../../../app/loadout/catalog";
import type { TextField as Field } from "../../../app/details/rules";
import { useEditor } from "../../../app/store";
import { usePlatform } from "../../../platform/PlatformContext";
import { useTexts } from "../../../text";
import { Help } from "../../common/Help";
import { Section } from "../../common/Section";
import { TextField } from "../../common/TextField";

function HangarTexts({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const value = (field: Field) => gameText(data, ship.blueprint.texts[field]) ?? "";
  return (
    <Section id="hangar-texts" title={texts.sections.hangar}>
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
    </Section>
  );
}

function SaveName({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const platform = usePlatform();
  return (
    <Section id="hangar-save" title={texts.hangar.saveName}>
      <Help topic="blueprintName">
        <TextField
          label={texts.hangar.blueprintName}
          className="input mono"
          value={ship.blueprint.name}
          onCommit={(name) => renameShip(platform, texts, { name })}
        />
      </Help>
      <Help topic="baseName">
        <TextField
          label={texts.hangar.baseName}
          className="input mono"
          value={ship.blueprint.layout}
          onCommit={(base) => renameShip(platform, texts, { base })}
        />
      </Help>
    </Section>
  );
}

export function HangarInspector() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present.ship);
  if (!ship) return null;
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.hangar.eyebrow}</span>
        <span className="ed-heading-title">{texts.inspector.hangar.title}</span>
      </div>
      <HangarTexts ship={ship} />
      <SaveName ship={ship} />
    </>
  );
}
