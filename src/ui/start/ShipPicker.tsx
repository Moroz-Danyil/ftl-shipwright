/**
 * A searchable list of the game's ships with their icons. The player ships
 * come first, as the hangar orders them: each ship type under a small heading
 * with its name, its layouts A, B and C as rows set in, each row naming its
 * layout; then the player ships in no hangar slot, under a heading of their
 * own. The other ships follow by class: a class of several ships under a
 * small heading, with its rows set in; a class of one ship as a plain row (its
 * title names the class). A row's title is the game's name for the ship, else
 * its class; the blueprint name is under it.
 */
import { useMemo, useState, type ReactNode } from "react";
import type { ShipCatalogEntry } from "../../core";
import { LAYOUT_LETTERS, hangarTypeName } from "../../app/hangar";
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
  sub,
  selected,
  onSelect,
  onChoose,
}: {
  ship: ShipCatalogEntry;
  /** The line under the title. */
  sub: string;
  selected: boolean;
  onSelect: (name: string) => void;
  onChoose: (name: string) => void;
}) {
  const texts = useTexts();
  const title = shipTitle(ship);
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

/** Rows under a small heading, set in. */
function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="picker-class" role="group" aria-label={heading}>
      <div className="picker-class-name" aria-hidden="true">
        {heading}
      </div>
      <div className="picker-class-ships">{children}</div>
    </div>
  );
}

export function ShipPicker({ ships, selected, onSelect, onChoose }: Props) {
  const texts = useTexts();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupShips(ships, query), [ships, query]);
  const players = groups.hangar.length + groups.otherPlayer.length;
  const others = groups.other.reduce((n, g) => n + g.ships.length, 0);
  const option = (ship: ShipCatalogEntry, sub: string) => (
    <ShipOption
      key={ship.name}
      ship={ship}
      sub={sub}
      selected={ship.name === selected}
      onSelect={onSelect}
      onChoose={onChoose}
    />
  );
  const classAndName = (ship: ShipCatalogEntry) =>
    ship.isPlayer && ship.className ? `${ship.className} · ${ship.name}` : ship.name;
  return (
    <div className="picker">
      <label className="field">
        {texts.common.search}
        <input
          className="input"
          type="search"
          data-autofocus=""
          value={query}
          placeholder={texts.shipPicker.placeholder}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="picker-list" role="listbox" aria-label={texts.common.search}>
        {players > 0 && (
          <div className="picker-group section-label">{texts.shipPicker.playerShips}</div>
        )}
        {groups.hangar.map((group) => (
          <Group
            key={group.type}
            heading={hangarTypeName({ ships }, group.type, texts.hangarSlot.typeNames[group.type])}
          >
            {group.ships.map(({ ship, layout }) =>
              option(ship, texts.shipPicker.layoutRow(LAYOUT_LETTERS[layout], ship.name))
            )}
          </Group>
        ))}
        {groups.otherPlayer.length > 0 && (
          <Group heading={texts.shipPicker.otherPlayerShips}>
            {groups.otherPlayer.map((ship) => option(ship, classAndName(ship)))}
          </Group>
        )}
        {others > 0 && (
          <div className="picker-group section-label">{texts.shipPicker.otherShips}</div>
        )}
        {groups.other.map((group) => {
          const heading = group.className ?? texts.shipPicker.noClass;
          if (group.ships.length === 1) return option(group.ships[0], group.ships[0].name);
          return (
            <Group key={heading} heading={heading}>
              {group.ships.map((ship) => option(ship, ship.name))}
            </Group>
          );
        })}
        {players + others === 0 && <div className="picker-empty">{texts.shipPicker.noMatch}</div>}
      </div>
    </div>
  );
}
