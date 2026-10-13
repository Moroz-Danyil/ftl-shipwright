/**
 * The selected explosion piece: position, motion ranges, picture and Delete.
 */
import type { Gib, Range, Ship } from "../../../core";
import { changeGib, deleteSelectedArt } from "../../../app/artActions";
import { pictureName } from "../../../app/art/model";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { NumberField } from "../../common/NumberField";

function RangeFields({
  label,
  range,
  onChange,
}: {
  label: string;
  range: Range;
  onChange: (range: Range) => void;
}) {
  const texts = useTexts();
  return (
    <fieldset className="ar-range">
      <legend className="eyebrow">{label}</legend>
      <div className="ed-grid2">
        <NumberField
          label={texts.art.min}
          value={range.min}
          decimals
          onCommit={(min) => onChange({ ...range, min })}
        />
        <NumberField
          label={texts.art.max}
          value={range.max}
          decimals
          onCommit={(max) => onChange({ ...range, max })}
        />
      </div>
    </fieldset>
  );
}

export function GibPanel({ ship, index }: { ship: Ship; index: number }) {
  const texts = useTexts();
  const picture = useEditor((s) => s.doc?.history.present.art.gibs[index]);
  const gib = ship.layoutXml.gibs[index];
  if (!gib) return null;
  const set = (patch: Partial<Gib>) => changeGib(index, patch);
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.art.selectedGib}</span>
        <span className="ed-heading-title">{texts.art.gibName(index + 1)}</span>
      </div>
      <div className="ed-grid2">
        <NumberField label={texts.art.x} value={gib.x} onCommit={(x) => set({ x })} />
        <NumberField label={texts.art.y} value={gib.y} onCommit={(y) => set({ y })} />
      </div>
      <RangeFields
        label={texts.art.velocity}
        range={gib.velocity}
        onChange={(velocity) => set({ velocity })}
      />
      <RangeFields
        label={texts.art.direction}
        range={gib.direction}
        onChange={(direction) => set({ direction })}
      />
      <RangeFields
        label={texts.art.angular}
        range={gib.angular}
        onChange={(angular) => set({ angular })}
      />
      <div className="ed-row">
        <span>{texts.art.pictureOf(picture ? pictureName(picture) : texts.art.noPicture)}</span>
        <button
          type="button"
          className="btn btn--small"
          onClick={() => useEditor.getState().openPicturePicker({ gib: index })}
        >
          {texts.art.change}
        </button>
      </div>
      <div>
        <button type="button" className="btn btn--danger" onClick={() => deleteSelectedArt()}>
          {texts.art.delete}
        </button>
      </div>
    </>
  );
}
