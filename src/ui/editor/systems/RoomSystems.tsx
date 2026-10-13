/**
 * The systems of the selected room: level, installed at the start, upgrade
 * limit, artillery weapon, interior picture and remove; with the warning for
 * an unusual mix of systems.
 */
import type { Room, Ship } from "../../../core";
import {
  levelLimit,
  removeSystemFromShip,
  setSystemInstalled,
  setSystemLevel,
  setSystemUpgradeLimit,
  setSystemWeapon,
} from "../../../app/systemActions";
import { useSystemName } from "../../../app/names";
import {
  artilleryWeapons,
  isInstalled,
  isUnusualMix,
  showsUpgradeLimit,
  systemsInRoom,
} from "../../../app/systems/rules";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { Stepper } from "../../common/Stepper";
import { SystemName } from "../../common/SystemIcon";
import { InteriorPicker } from "./InteriorPicker";

function ArtilleryWeapon({ index, weapon }: { index: number; weapon: string | undefined }) {
  const texts = useTexts();
  const weapons = useEditor((s) => s.game.data?.catalogs.weapons);
  const names = artilleryWeapons(weapons ?? []).map((w) => w.name);
  if (weapon && !names.includes(weapon)) names.unshift(weapon);
  return (
    <label className="field">
      {texts.systems.artilleryWeapon}
      <select
        className="input mono"
        value={weapon ?? ""}
        onChange={(e) => setSystemWeapon(index, e.target.value)}
      >
        {!weapon && <option value="" />}
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

function SystemCard({ ship, index, room }: { ship: Ship; index: number; room: Room }) {
  const texts = useTexts();
  const nameOf = useSystemName();
  const system = ship.blueprint.systems[index];
  const name = nameOf(system.system);
  const max = levelLimit(ship, index);
  return (
    <section
      className={isInstalled(system) ? "sy-card" : "sy-card sy-card--later"}
      aria-label={name}
      data-system={system.system}
    >
      <div className="ed-row">
        <span className="sy-card-title">
          <SystemName system={system.system} name={name} />
        </span>
        <button
          type="button"
          className="btn btn--small btn--danger"
          aria-label={texts.systems.removeNamed(name)}
          onClick={() => removeSystemFromShip(system.system)}
        >
          {texts.systems.remove}
        </button>
      </div>
      <Stepper
        label={texts.systems.level}
        value={system.power}
        min={1}
        max={Math.max(max, system.power)}
        onChange={(v) => setSystemLevel(index, v)}
      />
      {showsUpgradeLimit(ship, system) && (
        <Stepper
          label={texts.systems.upgradeLimit}
          value={system.max ?? max}
          min={1}
          max={max}
          onChange={(v) => setSystemUpgradeLimit(index, v)}
        />
      )}
      <label className="ed-choice">
        <input
          type="checkbox"
          checked={isInstalled(system)}
          onChange={(e) => setSystemInstalled(index, e.target.checked)}
        />
        {texts.systems.installed}
      </label>
      {system.system === "artillery" && <ArtilleryWeapon index={index} weapon={system.weapon} />}
      <InteriorPicker index={index} room={room} />
    </section>
  );
}

export function RoomSystems({ ship, room }: { ship: Ship; room: Room }) {
  const texts = useTexts();
  const indices = systemsInRoom(ship, room.id);
  const unusual = isUnusualMix(indices.map((i) => ship.blueprint.systems[i].system));
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.systems.selectedRoom}</span>
        <span className="ed-heading-title">{texts.systems.roomTitle(room.id)}</span>
      </div>
      {unusual && <div className="ed-group ed-group--warn">{texts.systems.unusualMix}</div>}
      {indices.length === 0 && <span className="muted">{texts.systems.empty}</span>}
      {indices.map((i) => (
        <SystemCard key={ship.blueprint.systems[i].system} ship={ship} index={i} room={room} />
      ))}
    </>
  );
}
