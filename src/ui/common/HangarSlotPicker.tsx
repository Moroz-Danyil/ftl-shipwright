/**
 * Picks a place in the game's hangar: one of its ship types (shown by the
 * select icon of the game's ship there) and one of the layouts that type has
 * (A, B and C; only A and B for the Lanius and the Crystal). Without a slot
 * (a ship under its own name) no type is chosen until one is picked, and the
 * layouts A, B and C wait for it.
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
  /** Each type's name under its icon, where there is room for it. */
  named?: boolean;
  /** The line naming the chosen slot; off where the place has a summary of its own. */
  summary?: boolean;
}

/** The layout a type opens with when it is picked without a slot: A. */
const FIRST_LAYOUT = 0;

export function HangarSlotPicker({
  slot,
  onPick,
  disabled = false,
  named = false,
  summary = true,
}: Props) {
  const texts = useTexts();
  const catalogs = useEditor((s) => s.game.data?.catalogs);
  const typeName = (type: HangarTypeId) =>
    hangarTypeName(catalogs, type, texts.hangarSlot.typeNames[type]);
  const layouts = slot ? layoutCount(slot.type) : LAYOUT_LETTERS.length;
  const pickType = (type: HangarTypeId) =>
    onPick(clampSlot({ type, layout: slot?.layout ?? FIRST_LAYOUT }));

  return (
    <div className="hs-picker">
      <div
        className={named ? "hs-types hs-types--named" : "hs-types"}
        role="radiogroup"
        aria-label={texts.hangarSlot.types}
      >
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
              {named && (
                <span className="hs-type-name" aria-hidden="true">
                  {name}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="hs-layouts" role="radiogroup" aria-label={texts.hangarSlot.layouts}>
        {LAYOUT_LETTERS.slice(0, layouts).map((letter, layout) => (
          <button
            key={letter}
            type="button"
            role="radio"
            className="hs-layout"
            aria-checked={slot?.layout === layout}
            aria-label={texts.hangarSlot.layout(letter)}
            disabled={disabled || !slot}
            onClick={() => slot && onPick({ ...slot, layout })}
          >
            {letter}
          </button>
        ))}
      </div>
      {slot && summary && (
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
