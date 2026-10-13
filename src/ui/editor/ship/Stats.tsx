/**
 * Everything about the ship that is set as a number: hull, reactor, weapon
 * and drone slots, starting missiles and drone parts.
 */
import type { Ship } from "../../../core";
import {
  setShipHull,
  setShipReactor,
  setSlotCount,
  setStartingDroneParts,
  setStartingMissiles,
} from "../../../app/loadoutActions";
import { LIMITS as SHIP_LIMITS, NEW_SHIP_HULL } from "../../../app/details/rules";
import { LIMITS, items, slots } from "../../../app/loadout/rules";
import { useTexts } from "../../../text";
import { Help } from "../../common/Help";
import { NumberField } from "../../common/NumberField";
import { Section } from "../../common/Section";
import { Stepper } from "../../common/Stepper";

export function Stats({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const bp = ship.blueprint;
  return (
    <Section id="ship-stats" title={texts.sections.stats} icon="stats">
      <Help topic="hull">
        <Stepper
          label={texts.loadout.hull}
          icon="hull"
          value={bp.health ?? NEW_SHIP_HULL}
          min={SHIP_LIMITS.hull.min}
          max={SHIP_LIMITS.hull.max}
          onChange={setShipHull}
        />
      </Help>
      <Help topic="reactor">
        <Stepper
          label={texts.loadout.reactor}
          icon="reactor"
          value={bp.maxPower ?? SHIP_LIMITS.reactor.min}
          min={SHIP_LIMITS.reactor.min}
          max={SHIP_LIMITS.reactor.max}
          onChange={setShipReactor}
        />
      </Help>
      <Help topic="weaponSlots">
        <Stepper
          label={texts.loadout.weaponSlots}
          icon="weaponSlots"
          value={slots(ship, "weapon")}
          min={items(ship, "weapon").length}
          max={LIMITS.weaponSlots}
          onChange={(n) => setSlotCount("weapon", n)}
        />
      </Help>
      <Help topic="droneSlots">
        <Stepper
          label={texts.loadout.droneSlots}
          icon="droneSlots"
          value={slots(ship, "drone")}
          min={items(ship, "drone").length}
          max={LIMITS.droneSlots}
          onChange={(n) => setSlotCount("drone", n)}
        />
      </Help>
      <div className="ed-grid2">
        <Help topic="missiles">
          <NumberField
            label={texts.loadout.missiles}
            icon="missiles"
            value={bp.weaponList?.missiles ?? 0}
            onCommit={setStartingMissiles}
          />
        </Help>
        <Help topic="droneParts">
          <NumberField
            label={texts.loadout.droneParts}
            icon="droneParts"
            value={bp.droneList?.drones ?? 0}
            onCommit={setStartingDroneParts}
          />
        </Help>
      </div>
    </Section>
  );
}
