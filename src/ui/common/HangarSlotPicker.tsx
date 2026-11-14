/**
 * Picks a place in the game's hangar: one of its ship types (shown by the
 * select icon of the game's ship there) and the layout A, B or C. Without a
 * slot (a ship under its own name) no type is chosen until one is picked.
 */
import {
  HANGAR_TYPES,
  LAYOUT_LETTERS,
  clampSlot,
  hangarTypeName,
  layoutCount,
  slotImg,
  slotName,
  type HangarSlot,
  type HangarTypeId,
} from "../../app/hangar";
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { ShipIcon } from "./ShipIcon";

interface Props {
  slot: HangarSlot | undefined;
  onPick: (slot: HangarSlot) => void;
  disabled?: boolean;
}

/** The layout a type opens with when it is picked without a slot: A. */
const FIRST_LAYOUT = 0;

export function HangarSlotPicker({ slot, onPick, disabled = false }: Props) {
  const texts = useTexts();
  const catalogs = useEditor((s) => s.game.data?.catalogs);
  const typeName = (type: HangarTypeId) =>
    hangarTypeName(catalogs, type, texts.hangarSlot.typeNames[type]);
  const layouts = slot ? layoutCount(slot.type) : LAYOUT_LETTERS.length;
  const pickType = (type: HangarTypeId) =>
    onPick(clampSlot({ type, layout: slot?.layout ?? FIRST_LAYOUT }));

  return (
    <div className="hs-picker">
      <div className="hs-types" role="radiogroup" aria-label={texts.hangarSlot.types}>
        {HANGAR_TYPES.map(({ id }) => {
          const name = typeName(id);
          const img = slotImg(
            catalogs,
            clampSlot({ type: id, layout: slot?.layout ?? FIRST_LAYOUT })
          );
          return (
            <button
              key={id}
              type="button"
              role="radio"
              className="hs-type"
              aria-checked={slot?.type === id}
              aria-label={name}
              title={name}
              disabled={disabled}
              onClick={() => pickType(id)}
            >
              <ShipIcon img={img} />
            </button>
          );
        })}
      </div>
      <div className="hs-layouts" role="radiogroup" aria-label={texts.hangarSlot.layouts}>
        {LAYOUT_LETTERS.map((letter, layout) => (
          <button
            key={letter}
            type="button"
            role="radio"
            className="hs-layout"
            aria-checked={slot?.layout === layout}
            aria-label={texts.hangarSlot.layout(letter)}
            disabled={disabled || !slot || layout >= layouts}
            onClick={() => slot && onPick({ ...slot, layout })}
          >
            {letter}
          </button>
        ))}
      </div>
      {slot && (
        <span className="hs-summary">
          {texts.hangarSlot.summary(
            typeName(slot.type),
            LAYOUT_LETTERS[slot.layout],
            slotName(slot)
          )}
        </span>
      )}
    </div>
  );
}
