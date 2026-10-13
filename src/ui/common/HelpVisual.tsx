/**
 * Pictures for the hover help, drawn the way the game shows the value: the
 * hull bar, the reactor bars, the hangar texts and the weapon or drone slots.
 * Topics without one draw nothing.
 */
import { gameText } from "../../app/loadout/catalog";
import { LIMITS, NEW_SHIP_HULL } from "../../app/details/rules";
import { slots } from "../../app/loadout/rules";
import { useEditor } from "../../app/store";
import type { Texts } from "../../text";

type Topic = keyof Texts["help"];

function HullBar({ hull }: { hull: number }) {
  return (
    <div className="hv-box hv-hull" aria-hidden="true">
      {Array.from({ length: Math.min(hull, LIMITS.hull.max) }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

function ReactorBars({ power }: { power: number }) {
  return (
    <div className="hv-box hv-reactor" aria-hidden="true">
      {Array.from({ length: power }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

function SlotBoxes({ count }: { count: number }) {
  return (
    <div className="hv-box hv-slots" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

function HangarCard({ topic }: { topic: Topic }) {
  const data = useEditor((s) => s.game.data);
  const texts = useEditor((s) => s.doc?.history.present.ship.blueprint.texts);
  if (!texts) return null;
  const mark = (t: Topic) => (t === topic ? "hv-mark" : undefined);
  return (
    <div className="hv-box hv-hangar" aria-hidden="true">
      <span className={mark("shipName")}>{gameText(data, texts.name)}</span>
      <span className={mark("shipClass")}>{gameText(data, texts.class)}</span>
      <span className={mark("shipDescription")}>{gameText(data, texts.desc)}</span>
    </div>
  );
}

export function HelpVisual({ topic }: { topic: Topic }) {
  const ship = useEditor((s) => s.doc?.history.present.ship);
  if (!ship) return null;
  const bp = ship.blueprint;
  switch (topic) {
    case "hull":
      return <HullBar hull={bp.health ?? NEW_SHIP_HULL} />;
    case "reactor":
      return <ReactorBars power={bp.maxPower ?? LIMITS.reactor.min} />;
    case "weaponSlots":
      return <SlotBoxes count={slots(ship, "weapon")} />;
    case "droneSlots":
      return <SlotBoxes count={slots(ship, "drone")} />;
    case "shipName":
    case "shipClass":
    case "shipDescription":
      return <HangarCard topic={topic} />;
    default:
      return null;
  }
}
