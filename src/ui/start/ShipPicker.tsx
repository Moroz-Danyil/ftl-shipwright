/**
 * A searchable list of the game's ships, player ships first, with their icons.
 */
import { useMemo, useState } from "react";
import type { ShipCatalogEntry } from "../../core";
import { groupShips } from "../../app/shipList";
import { useTexts } from "../../text";
import { ShipIcon } from "../common/ShipIcon";

interface Props {
  ships: ShipCatalogEntry[];
  selected: string | undefined;
  onSelect: (name: string) => void;
  /** Double click or Enter on a ship. */
  onChoose: (name: string) => void;
}

function ShipOption({
  ship,
  selected,
  onSelect,
  onChoose,
}: {
  ship: ShipCatalogEntry;
  selected: boolean;
  onSelect: (name: string) => void;
  onChoose: (name: string) => void;
}) {
  const texts = useTexts();
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className="picker-item"
      onClick={() => onSelect(ship.name)}
      onDoubleClick={() => onChoose(ship.name)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onChoose(ship.name);
        }
      }}
    >
      <ShipIcon img={ship.isPlayer ? ship.img : undefined} />
      <span className="picker-text">
        <span className="picker-name">{ship.displayName}</span>
        <span className="picker-sub">
          {ship.className ? `${ship.className} · ${ship.name}` : ship.name}
        </span>
      </span>
      {ship.fromMod && <span className="picker-tag">{texts.shipPicker.fromMod}</span>}
    </button>
  );
}

export function ShipPicker({ ships, selected, onSelect, onChoose }: Props) {
  const texts = useTexts();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupShips(ships, query), [ships, query]);
  const option = (ship: ShipCatalogEntry) => (
    <ShipOption
      key={ship.name}
      ship={ship}
      selected={ship.name === selected}
      onSelect={onSelect}
      onChoose={onChoose}
    />
  );
  return (
    <div className="picker">
      <label className="field">
        {texts.common.search}
        <input
          className="input"
          type="search"
          value={query}
          placeholder={texts.shipPicker.placeholder}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="picker-list" role="listbox" aria-label={texts.common.search}>
        {groups.player.length > 0 && (
          <div className="picker-group section-label">{texts.shipPicker.playerShips}</div>
        )}
        {groups.player.map(option)}
        {groups.other.length > 0 && (
          <div className="picker-group section-label">{texts.shipPicker.otherShips}</div>
        )}
        {groups.other.map(option)}
        {groups.player.length + groups.other.length === 0 && (
          <div className="picker-empty">{texts.shipPicker.noMatch}</div>
        )}
      </div>
    </div>
  );
}
