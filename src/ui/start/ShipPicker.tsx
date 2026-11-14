/**
 * A searchable list of the game's ships with their icons: player ships first,
 * then the other ships by class: a class of several ships under a small
 * heading, with its rows set in; a class of one ship as a plain row (its title
 * names the class). A row's title is the game's name for the ship, else its
 * class; the blueprint name is under it.
 */
import { useMemo, useState } from "react";
import type { ShipCatalogEntry } from "../../core";
import { groupShips, shipTitle } from "../../app/shipList";
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
  const title = shipTitle(ship);
  const sub = ship.isPlayer && ship.className ? `${ship.className} · ${ship.name}` : ship.name;
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
      <ShipIcon img={ship.img} />
      <span className="picker-text">
        <span className="picker-name">{title}</span>
        {sub !== title && <span className="picker-sub">{sub}</span>}
      </span>
      {ship.fromMod && <span className="picker-tag">{texts.shipPicker.fromMod}</span>}
    </button>
  );
}

export function ShipPicker({ ships, selected, onSelect, onChoose }: Props) {
  const texts = useTexts();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupShips(ships, query), [ships, query]);
  const others = groups.other.reduce((n, g) => n + g.ships.length, 0);
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
        {others > 0 && (
          <div className="picker-group section-label">{texts.shipPicker.otherShips}</div>
        )}
        {groups.other.map((group) => {
          const heading = group.className ?? texts.shipPicker.noClass;
          if (group.ships.length === 1) return option(group.ships[0]);
          return (
            <div key={heading} className="picker-class" role="group" aria-label={heading}>
              <div className="picker-class-name" aria-hidden="true">
                {heading}
              </div>
              <div className="picker-class-ships">{group.ships.map(option)}</div>
            </div>
          );
        })}
        {groups.player.length + others === 0 && (
          <div className="picker-empty">{texts.shipPicker.noMatch}</div>
        )}
      </div>
    </div>
  );
}
