/**
 * The game's weapons, drones or augments as searchable cards. A click puts
 * the item in the next free slot (or adds the augment); hovering or focusing
 * a card shows its details below the grid.
 */
import { useMemo, useState } from "react";
import { addShipAugment, addLoadoutItem } from "../../../app/loadoutActions";
import {
  gameText,
  itemTitle,
  matchesItem,
  offeredItems,
  type CatalogItem,
  type ItemKind,
} from "../../../app/loadout/catalog";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { AugmentIcon, DronePicture, WeaponPicture } from "../../common/ItemPictures";
import { detailRows, statsLine } from "./itemText";

export function ItemPicture({ item, size = 40 }: { item: CatalogItem; size?: number }) {
  if (item.kind === "weapon") return <WeaponPicture name={item.entry.name} size={size} />;
  if (item.kind === "drone") return <DronePicture name={item.entry.name} size={size} />;
  return <AugmentIcon size={size} />;
}

function Details({ item }: { item: CatalogItem }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const desc = gameText(data, item.entry.desc);
  const tooltip = item.kind === "weapon" ? gameText(data, item.entry.tooltip) : undefined;
  return (
    <section className="lo-details" aria-label={itemTitle(data, item)}>
      <span className="lo-details-title">{itemTitle(data, item)}</span>
      <span className="eyebrow mono">{item.entry.name}</span>
      {desc && <p className="lo-details-text">{desc}</p>}
      {tooltip && tooltip !== desc && <p className="lo-details-text muted">{tooltip}</p>}
      <dl className="lo-stats">
        {detailRows(texts, item).map(([label, value]) => (
          <div key={label} className="ed-row">
            <dt>{label}</dt>
            <dd className="mono">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ItemCards({ kind }: { kind: ItemKind }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<CatalogItem>();
  const all = useMemo(() => offeredItems(data, kind), [data, kind]);
  const matching = useMemo(
    () => all.filter((item) => matchesItem(data, item, query)),
    [all, data, query]
  );
  const add = (item: CatalogItem) => {
    if (item.kind === "augment") addShipAugment(item.entry.name, texts);
    else addLoadoutItem(item.kind, item.entry.name, texts);
  };
  return (
    <>
      <label className="field">
        {texts.common.search}
        <input
          className="input"
          type="search"
          value={query}
          placeholder={texts.loadout.searchPlaceholder[kind]}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="lo-cards">
        {matching.map((item) => (
          <button
            key={item.entry.name}
            type="button"
            className="lo-card"
            data-item={item.entry.name}
            onClick={() => add(item)}
            onPointerEnter={() => setShown(item)}
            onFocus={() => setShown(item)}
          >
            <span className="lo-card-pic">
              <ItemPicture item={item} />
            </span>
            <span className="lo-card-title">{itemTitle(data, item)}</span>
            <span className="lo-card-stats">{statsLine(texts, item)}</span>
          </button>
        ))}
        {matching.length === 0 && <span className="muted">{texts.loadout.noMatches}</span>}
      </div>
      {shown ? <Details item={shown} /> : <span className="ed-help">{texts.loadout.hint}</span>}
    </>
  );
}
