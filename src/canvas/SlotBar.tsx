/**
 * The weapon and drone slots at the bottom of the canvas (Loadout), like the
 * game's own bar: filled slots show the item and its short name, numbered
 * like the mounts; empty ones are dashed. A click selects a slot; hovering a
 * weapon slot highlights its mount.
 */
import { findItem, itemShortName } from "../app/loadout/catalog";
import { items, slots, type LoadoutKind } from "../app/loadout/rules";
import { isSelected, selectionOf } from "../app/selection";
import { useEditor } from "../app/store";
import { useTexts } from "../text";
import { DronePicture, WeaponPicture } from "../ui/common/ItemPictures";

function Slot({ kind, index, name }: { kind: LoadoutKind; index: number; name?: string }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const selected = useEditor((s) => isSelected(s.selection, { kind, index }));
  const hovered = useEditor((s) => kind === "weapon" && s.hoverWeapon === index);
  const setHover = useEditor((s) => s.setHoverWeapon);
  const item = name ? findItem(data, kind, name) : undefined;
  const label = name ? (item ? itemShortName(data, item) : name) : texts.loadout.emptySlot[kind];
  if (!name)
    return (
      <div
        className={`lo-slot lo-slot--empty lo-slot--${kind}`}
        aria-label={texts.loadout.emptySlotLabel(index + 1)}
      >
        {label}
      </div>
    );
  const className = [
    "lo-slot",
    `lo-slot--${kind}`,
    selected ? "lo-slot--selected" : "",
    hovered ? "lo-slot--hover" : "",
  ]
    .filter((c) => c !== "")
    .join(" ");
  return (
    <button
      type="button"
      className={className}
      aria-pressed={selected}
      aria-label={texts.loadout.slotLabel(index + 1, label)}
      data-testid={`${kind}-slot-${index + 1}`}
      onClick={() => useEditor.getState().select(selectionOf({ kind, index }))}
      onPointerEnter={() => kind === "weapon" && setHover(index)}
      onPointerLeave={() => kind === "weapon" && setHover(null)}
    >
      <span className="lo-slot-number">{index + 1}</span>
      {kind === "weapon" ? (
        <WeaponPicture name={name} size={30} />
      ) : (
        <DronePicture name={name} size={30} />
      )}
      <span className="lo-slot-name">{label}</span>
    </button>
  );
}

function Group({ kind }: { kind: LoadoutKind }) {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present.ship);
  if (!ship) return null;
  const list = items(ship, kind);
  const count = Math.max(slots(ship, kind), list.length);
  const title = kind === "weapon" ? texts.loadout.weaponsCount : texts.loadout.dronesCount;
  return (
    <div className="lo-group">
      <span className="section-label">{title(list.length, slots(ship, kind))}</span>
      <div className="lo-slots">
        {Array.from({ length: count }, (_, i) => (
          <Slot key={i} kind={kind} index={i} name={list[i]} />
        ))}
      </div>
    </div>
  );
}

export function SlotBar() {
  const texts = useTexts();
  return (
    <div
      className="lo-bar"
      role="group"
      aria-label={texts.loadout.bar}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <Group kind="weapon" />
      <div className="lo-divider" />
      <Group kind="drone" />
    </div>
  );
}
