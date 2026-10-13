/**
 * The Ship inspector, everything about the ship itself: its info and save
 * name, the numbers (hull, reactor, slots, missiles, drone parts), the crew,
 * and its weapons, drones and augments with the game's items to add.
 */
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { Crew } from "./Crew";
import { Augments, SlotList } from "./Equipment";
import { Info } from "./Info";
import { Stats } from "./Stats";

export function ShipInspector() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present.ship);
  if (!ship) return null;
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.ship.eyebrow}</span>
        <span className="ed-heading-title">{texts.inspector.ship.title}</span>
      </div>
      <Info ship={ship} />
      <Stats ship={ship} />
      <Crew ship={ship} />
      <SlotList ship={ship} kind="weapon" />
      <SlotList ship={ship} kind="drone" />
      <Augments ship={ship} />
    </>
  );
}
