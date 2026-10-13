/**
 * The ship's weapons, drones and augments: each a section with the ship's
 * items as a list, then the game's items as cards to add one. Weapons and
 * drones are listed in slot order; a click on one selects its slot (as the
 * slot bar does), the arrows move it to an earlier or later slot. Hovering
 * an item shows its details beside the inspector, and hovering a weapon
 * also marks its mount on the ship.
 */
import type { Ship } from "../../../core";
import { moveSlot, removeShipAugment, removeSlot } from "../../../app/loadoutActions";
import { findItem, itemTitle, type CatalogItem } from "../../../app/loadout/catalog";
import { LIMITS, items, slots, type LoadoutKind } from "../../../app/loadout/rules";
import { isSelected, selectionOf } from "../../../app/selection";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { HoverPanel } from "../../common/HoverPanel";
import { ArrowIcon, CrossIcon } from "../../common/icons";
import { Section } from "../../common/Section";
import { useHoverPanel } from "../../common/useHoverPanel";
import { Details, ItemCards, ItemPicture } from "./ItemCards";
import { statsLine } from "./itemText";

type ItemPanel = ReturnType<typeof useHoverPanel<CatalogItem>>;

/** The details of the hovered item, beside the inspector. */
function ItemPanelView({ panel }: { panel: ItemPanel }) {
  if (!panel.shown) return null;
  return (
    <HoverPanel
      anchor={panel.shown.anchor}
      picture={<ItemPicture item={panel.shown.value} size={112} />}
    >
      <Details item={panel.shown.value} />
    </HoverPanel>
  );
}

function SlotRow({
  kind,
  index,
  name,
  last,
  panel,
}: {
  kind: LoadoutKind;
  index: number;
  name: string;
  last: boolean;
  panel: ItemPanel;
}) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const selected = useEditor((s) => isSelected(s.selection, { kind, index }));
  const setHover = useEditor((s) => s.setHoverWeapon);
  const item = findItem(data, kind, name);
  const title = item ? itemTitle(data, item) : texts.loadout.unknownItem(name);
  const enter = (entry: HTMLElement) => {
    if (item) panel.show(item, entry);
    if (kind === "weapon") setHover(index);
  };
  const leave = () => {
    panel.hide();
    if (kind === "weapon") setHover(null);
  };
  return (
    <li className="ar-gib eq-row" data-slot={index}>
      <button
        type="button"
        className="ar-gib-main"
        aria-pressed={selected}
        aria-label={texts.loadout.slotLabel(index + 1, title)}
        onClick={() => useEditor.getState().select(selectionOf({ kind, index }))}
        onPointerEnter={(e) => enter(e.currentTarget)}
        onPointerLeave={leave}
        onFocus={(e) => enter(e.currentTarget)}
        onBlur={leave}
      >
        <span className="eq-number mono">{index + 1}</span>
        <span className="ar-thumb">{item && <ItemPicture item={item} size={36} />}</span>
        <span className="ar-picture-text">
          <span>{title}</span>
          {item && <span className="eyebrow">{statsLine(texts, item)}</span>}
        </span>
      </button>
      <button
        type="button"
        className="btn btn--icon btn--small"
        aria-label={texts.loadout.earlierNamed(title)}
        disabled={index === 0}
        onClick={() => moveSlot(kind, index, -1)}
      >
        <ArrowIcon direction="up" />
      </button>
      <button
        type="button"
        className="btn btn--icon btn--small"
        aria-label={texts.loadout.laterNamed(title)}
        disabled={last}
        onClick={() => moveSlot(kind, index, 1)}
      >
        <ArrowIcon direction="down" />
      </button>
      <button
        type="button"
        className="btn btn--icon btn--small"
        aria-label={texts.loadout.removeNamed(title)}
        onClick={() => {
          leave();
          removeSlot(kind, index);
        }}
      >
        <CrossIcon />
      </button>
    </li>
  );
}

/** The Weapons or Drones section. */
export function SlotList({ ship, kind }: { ship: Ship; kind: LoadoutKind }) {
  const texts = useTexts();
  const panel = useHoverPanel<CatalogItem>();
  const list = items(ship, kind);
  return (
    <Section
      id={kind === "weapon" ? "ship-weapons" : "ship-drones"}
      title={kind === "weapon" ? texts.sections.weapons : texts.sections.drones}
      count={texts.sections.count(list.length, slots(ship, kind))}
    >
      {list.length === 0 ? (
        <span className="muted">{texts.loadout.noItems[kind]}</span>
      ) : (
        <ul className="eq-list" aria-label={texts.loadout.equipped[kind]}>
          {list.map((name, i) => (
            <SlotRow
              key={i}
              kind={kind}
              index={i}
              name={name}
              last={i === list.length - 1}
              panel={panel}
            />
          ))}
        </ul>
      )}
      <ItemPanelView panel={panel} />
      <ItemCards kind={kind} />
    </Section>
  );
}

export function Augments({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const panel = useHoverPanel<CatalogItem>();
  const augments = ship.blueprint.augments;
  return (
    <Section
      id="ship-augments"
      title={texts.sections.augments}
      count={texts.sections.count(augments.length, LIMITS.augments)}
    >
      {augments.length === 0 ? (
        <span className="muted">{texts.loadout.noAugments}</span>
      ) : (
        <ul className="eq-list" aria-label={texts.loadout.equipped.augment}>
          {augments.map((name, i) => {
            const item = findItem(data, "augment", name);
            const title = item ? itemTitle(data, item) : texts.loadout.unknownItem(name);
            return (
              <li key={i} className="ar-gib eq-row">
                <span
                  className="eq-augment"
                  tabIndex={item ? 0 : undefined}
                  onPointerEnter={(e) => item && panel.show(item, e.currentTarget)}
                  onPointerLeave={panel.hide}
                  onFocus={(e) => item && panel.show(item, e.currentTarget)}
                  onBlur={panel.hide}
                >
                  <span className="ar-thumb">{item && <ItemPicture item={item} size={28} />}</span>
                  <span className="ar-picture-text">
                    <span>{title}</span>
                    {item && <span className="eyebrow">{statsLine(texts, item)}</span>}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn--icon btn--small"
                  aria-label={texts.loadout.removeNamed(title)}
                  onClick={() => {
                    panel.hide();
                    removeShipAugment(i);
                  }}
                >
                  <CrossIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <ItemPanelView panel={panel} />
      <ItemCards kind="augment" />
    </Section>
  );
}
