/**
 * The weapon and drone slots at the bottom of the canvas (Ship), like the
 * game's own bar: filled slots show the item and its short name, numbered
 * like the mounts; empty ones are dashed. A click on a filled slot selects
 * it, a right click removes its item (the later ones move up); hovering a
 * weapon slot highlights its mount. A click (or Enter, Space) on an empty slot
 * opens a picker above the bar with the game's weapons or drones; the one
 * picked goes in the first empty slot. Esc or a click outside closes it.
 */
import { useEffect, useRef, useState } from "react";
import { findItem, itemShortName } from "../app/loadout/catalog";
import { items, slots, type LoadoutKind } from "../app/loadout/rules";
import { removeSlot } from "../app/loadoutActions";
import { isSelected, selectionOf } from "../app/selection";
import { useEditor } from "../app/store";
import { useTexts } from "../text";
import { DronePicture, WeaponPicture } from "../ui/common/ItemPictures";
import { ItemList } from "../ui/editor/ship/ItemList";

/** The picker that is open: which kind, and for which (first empty) slot. */
interface Picking {
  kind: LoadoutKind;
  index: number;
}

interface SlotProps {
  kind: LoadoutKind;
  index: number;
  name?: string;
  /** The first empty slot of the kind: where a picked item goes. */
  firstEmpty: number;
  picking: boolean;
  onPick: (picking: Picking | null) => void;
}

function EmptySlot({ kind, index, firstEmpty, picking, onPick }: SlotProps) {
  const texts = useTexts();
  return (
    <button
      type="button"
      className={`lo-slot lo-slot--empty lo-slot--${kind}${picking ? " lo-slot--picking" : ""}`}
      aria-label={texts.loadout.emptySlotLabel(index + 1)}
      aria-haspopup="dialog"
      aria-expanded={picking}
      title={texts.loadout.pickHint[kind]}
      data-testid={`${kind}-slot-${index + 1}`}
      onClick={() => onPick(picking ? null : { kind, index: firstEmpty })}
    >
      {texts.loadout.emptySlot[kind]}
    </button>
  );
}

function Slot(props: SlotProps) {
  const { kind, index, name, onPick } = props;
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const selected = useEditor((s) => isSelected(s.selection, { kind, index }));
  const hovered = useEditor((s) => kind === "weapon" && s.hoverWeapon === index);
  const setHover = useEditor((s) => s.setHoverWeapon);
  if (!name) return <EmptySlot {...props} />;
  const item = findItem(data, kind, name);
  const label = item ? itemShortName(data, item) : name;
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
      title={texts.loadout.slotHint}
      data-testid={`${kind}-slot-${index + 1}`}
      onClick={() => {
        onPick(null);
        useEditor.getState().select(selectionOf({ kind, index }));
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onPick(null);
        removeSlot(kind, index);
      }}
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

function Group({
  kind,
  picking,
  onPick,
}: {
  kind: LoadoutKind;
  picking: Picking | null;
  onPick: (picking: Picking | null) => void;
}) {
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
          <Slot
            key={i}
            kind={kind}
            index={i}
            name={list[i]}
            firstEmpty={list.length}
            picking={picking?.kind === kind && picking.index === i}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  );
}

/** The game's weapons or drones above the bar; a click puts one in the first empty slot. */
function Picker({ picking, onClose }: { picking: Picking; onClose: () => void }) {
  const texts = useTexts();
  return (
    <div
      className={`lo-picker lo-picker--${picking.kind}`}
      role="dialog"
      aria-label={texts.loadout.pickTitle[picking.kind](picking.index + 1)}
    >
      <span className="lo-picker-title">
        {texts.loadout.pickTitle[picking.kind](picking.index + 1)}
      </span>
      <ItemList kind={picking.kind} autoFocus onAdded={onClose} />
    </div>
  );
}

export function SlotBar() {
  const texts = useTexts();
  const [picking, setPicking] = useState<Picking | null>(null);
  const dock = useRef<HTMLDivElement>(null);

  // A click anywhere outside the bar and the picker closes the picker.
  useEffect(() => {
    if (!picking) return;
    const onDown = (event: PointerEvent) => {
      if (!dock.current?.contains(event.target as Node)) setPicking(null);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [picking]);

  // The wheel scrolls the picker's list instead of zooming the canvas.
  useEffect(() => {
    const element = dock.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => event.stopPropagation();
    element.addEventListener("wheel", onWheel);
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const close = (refocus: boolean) => {
    const slot = picking && `[data-testid="${picking.kind}-slot-${picking.index + 1}"]`;
    setPicking(null);
    if (refocus && slot) dock.current?.querySelector<HTMLElement>(slot)?.focus();
  };

  return (
    <div
      ref={dock}
      className="lo-dock"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !picking) return;
        e.stopPropagation();
        close(true);
      }}
    >
      {picking && <Picker key={picking.kind} picking={picking} onClose={() => close(false)} />}
      <div className="lo-bar" role="group" aria-label={texts.loadout.bar} data-tour="slots">
        <Group kind="weapon" picking={picking} onPick={setPicking} />
        <div className="lo-divider" />
        <Group kind="drone" picking={picking} onPick={setPicking} />
      </div>
    </div>
  );
}
