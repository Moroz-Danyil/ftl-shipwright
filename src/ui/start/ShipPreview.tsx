/**
 * The ship picked to copy, beside the list: its picture large (the hull
 * picture, else the select icon), its name and class, and how many rooms,
 * systems, weapons, crew and hull points it starts with.
 */
import { useEffect, useState } from "react";
import type { ShipCatalogEntry } from "../../core";
import { shipFacts, type ShipFacts } from "../../app/shipFacts";
import { shipTitle } from "../../app/shipList";
import { useEditor } from "../../app/store";
import { usePicture } from "../../canvas/pictures";
import { useTexts } from "../../text";
import { HullIcon } from "../common/icons";

export function ShipPreview({ ship }: { ship: ShipCatalogEntry | undefined }) {
  const texts = useTexts();
  const view = useEditor((s) => s.game.data?.view);
  const [loaded, setLoaded] = useState<{ name: string; facts: ShipFacts }>();
  useEffect(() => {
    if (!view || !ship) return;
    let live = true;
    void shipFacts(view, ship).then((facts) => {
      if (live) setLoaded({ name: ship.name, facts });
    });
    return () => {
      live = false;
    };
  }, [view, ship]);
  const facts = ship && loaded?.name === ship.name ? loaded.facts : undefined;
  const picture = usePicture(view, facts?.picture);

  if (!ship) {
    return (
      <div className="ns-preview ns-preview--none" aria-live="polite">
        <span className="muted">{texts.newShip.preview.none}</span>
      </div>
    );
  }
  const p = texts.newShip.preview;
  const value = (n: number | undefined) => (facts && n !== undefined ? String(n) : p.unknown);
  const rows: [string, string][] = [
    [p.rooms, value(facts?.rooms)],
    [p.systems, value(facts?.systems)],
    [p.weapons, value(facts?.weapons)],
    [p.crew, value(facts?.crew)],
    [p.hull, value(facts?.hull)],
  ];
  const title = shipTitle(ship);
  return (
    <section className="ns-preview" aria-label={title} aria-live="polite">
      <div className="ns-preview-pic">
        {picture ? (
          <img src={picture.url} alt="" draggable={false} />
        ) : (
          <span className="ship-icon-mark">
            <HullIcon />
          </span>
        )}
      </div>
      <div className="ns-preview-head">
        <span className="ns-preview-name">{title}</span>
        {ship.className && ship.className !== title && (
          <span className="ns-preview-class">{ship.className}</span>
        )}
        <span className="ns-preview-id mono">{ship.name}</span>
      </div>
      <dl className="ns-facts">
        {rows.map(([label, v]) => (
          <div key={label} className="ns-fact">
            <dt>{label}</dt>
            <dd className="mono">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
