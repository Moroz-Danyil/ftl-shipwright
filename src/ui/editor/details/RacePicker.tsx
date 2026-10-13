/**
 * "Add race…": a list of the races not yet in the crew. A click adds one crew
 * member of that race; hovering or focusing a race shows its description and
 * abilities beside the inspector. Esc or a click elsewhere closes the list.
 * A race already in the crew shows the same details when its name is hovered.
 */
import { useEffect, useRef, useState } from "react";
import type { RaceCatalogEntry } from "../../../core";
import { setCrewAmount } from "../../../app/loadoutActions";
import { gameText } from "../../../app/loadout/catalog";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { HoverPanel } from "../../common/HoverPanel";
import { useHoverPanel } from "../../common/useHoverPanel";
import { RacePicture } from "../../common/ItemPictures";

function RaceDetails({ race }: { race: RaceCatalogEntry }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const title = gameText(data, race.title) || race.name;
  const desc = gameText(data, race.desc);
  const powers = race.powers.map((p) => gameText(data, p)).filter(Boolean);
  return (
    <section className="lo-details" aria-label={title}>
      <span className="lo-details-title">{title}</span>
      <span className="eyebrow mono">{race.name}</span>
      {desc && <p className="lo-details-text">{desc}</p>}
      {powers.length > 0 && (
        <>
          <span className="eyebrow">{texts.details.abilities}</span>
          <ul className="lo-details-text">
            {powers.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}
      {race.cost !== undefined && (
        <dl className="lo-stats">
          <div className="ed-row">
            <dt>{texts.loadout.details.cost}</dt>
            <dd className="mono">{texts.loadout.units.scrap(race.cost)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

/** A crew race's sprite and name; hovering them shows the race's details. */
export function RaceName({ race, title }: { race: string; title: string }) {
  const entry = useEditor((s) => s.game.data?.catalogs.races.find((r) => r.name === race));
  const panel = useHoverPanel<RaceCatalogEntry>();
  return (
    <span
      className="dt-crew-name"
      onPointerEnter={(e) => entry && panel.show(entry, e.currentTarget)}
      onPointerLeave={panel.hide}
    >
      <RacePicture race={race} size={36} />
      <span>{title}</span>
      {panel.shown && (
        <HoverPanel anchor={panel.shown.anchor} picture={<RacePicture race={race} size={105} />}>
          <RaceDetails race={panel.shown.value} />
        </HoverPanel>
      )}
    </span>
  );
}

export function RacePicker({ races }: { races: RaceCatalogEntry[] }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const panel = useHoverPanel<RaceCatalogEntry>();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    panel.hide();
  };
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  });
  return (
    <div
      ref={box}
      className="dt-add"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <button
        type="button"
        className="btn"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {texts.details.addRace}
      </button>
      {open && (
        <ul className="dt-race-list" aria-label={texts.details.races} onPointerLeave={panel.hide}>
          {races.map((race) => (
            <li key={race.name}>
              <button
                type="button"
                className="dt-race-item"
                onClick={() => {
                  close();
                  setCrewAmount(race.name, 1);
                }}
                onPointerEnter={(e) => panel.show(race, e.currentTarget)}
                onFocus={(e) => panel.show(race, e.currentTarget)}
                onBlur={panel.hide}
              >
                <RacePicture race={race.name} size={28} />
                <span>{gameText(data, race.title) || race.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {panel.shown && (
        <HoverPanel
          anchor={panel.shown.anchor}
          picture={<RacePicture race={panel.shown.value.name} size={105} />}
        >
          <RaceDetails race={panel.shown.value} />
        </HoverPanel>
      )}
    </div>
  );
}
