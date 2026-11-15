/**
 * Picks a place in the game's hangar: a layout (A, B or C) and one of the
 * ship types that have it, each shown by the select icon of the game's ship
 * there. The Lanius and the Crystal have no layout C, so with C chosen they
 * are not offered; choosing C while one of them is picked moves to the first
 * type that has C. Without a slot (a ship under its own name) no type is
 * chosen until one is picked, and the layouts wait for it.
 */
import {
  HANGAR_TYPES,
  LAYOUT_LETTERS,
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
  const layout = slot?.layout ?? FIRST_LAYOUT;
  const types = HANGAR_TYPES.filter(({ id }) => layoutCount(id) > layout);
  const pickType = (type: HangarTypeId) => onPick({ type, layout });
  const pickLayout = (next: number) => {
    if (!slot) return;
    const type =
      layoutCount(slot.type) > next
        ? slot.type
        : HANGAR_TYPES.find(({ id }) => layoutCount(id) > next)!.id;
    onPick({ type, layout: next });
  };

  return (
    <div className="hs-picker">
      <div className="hs-layouts" role="radiogroup" aria-label={texts.hangarSlot.layouts}>
        {LAYOUT_LETTERS.map((letter, index) => (
          <button
            key={letter}
            type="button"
            role="radio"
            className="hs-layout"
            aria-checked={slot?.layout === index}
            aria-label={texts.hangarSlot.layout(letter)}
            disabled={disabled || !slot}
            onClick={() => pickLayout(index)}
          >
            {letter}
          </button>
        ))}
      </div>
      <div
        className={named ? "hs-types hs-types--named" : "hs-types"}
        role="radiogroup"
        aria-label={texts.hangarSlot.types}
      >
        {types.map(({ id }) => {
          const name = typeName(id);
          const img = slotImg(catalogs, { type: id, layout });
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
