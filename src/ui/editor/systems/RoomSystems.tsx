/**
 * "Systems in this room": a card for each system of the selected room with
 * its level, upgrade limit, installed at the start, artillery weapon, crew
 * station facing, interior picture and remove; with the warning for an
 * unusual mix of systems and the crew cells medbay and clonebay keep.
 */
import type { Room, Ship } from "../../../core";
import { turnStation } from "../../../app/layoutActions";
import { DIRECTIONS, isStationSystem, stationOf } from "../../../app/layout/stations";
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
import { Help } from "../../common/Help";
import { Section } from "../../common/Section";
import { Stepper } from "../../common/Stepper";
import { SystemName } from "../../common/SystemIcon";
import { InteriorPicker } from "./InteriorPicker";

function ArtilleryWeapon({ index, weapon }: { index: number; weapon: string | undefined }) {
  const texts = useTexts();
  const weapons = useEditor((s) => s.game.data?.catalogs.weapons);
  const names = artilleryWeapons(weapons ?? []).map((w) => w.name);
  if (weapon && !names.includes(weapon)) names.unshift(weapon);
  return (
    <Help topic="artilleryWeapon">
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
    </Help>
  );
}

/** The facing of a system's crew station, turned with the same action as the station panel's. */
function StationFacing({ ship, index }: { ship: Ship; index: number }) {
  const texts = useTexts();
  const station = stationOf(ship, index);
  if (!station) return <span className="muted">{texts.systems.noStation}</span>;
  return (
    <Help topic="stationFacing">
      <div className="sy-station">
        <span className="eyebrow">{texts.systems.station(station.slot.number)}</span>
        <div className="ed-directions" role="group" aria-label={texts.inspector.facing}>
          {DIRECTIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={station.slot.direction === d ? "btn btn--on" : "btn"}
              aria-pressed={station.slot.direction === d}
              onClick={() => turnStation(index, d)}
            >
              {texts.inspector.directions[d]}
            </button>
          ))}
        </div>
      </div>
    </Help>
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
      <Help topic="systemLevel">
        <Stepper
          label={texts.systems.level}
          value={system.power}
          min={1}
          max={Math.max(max, system.power)}
          onChange={(v) => setSystemLevel(index, v)}
        />
      </Help>
      {showsUpgradeLimit(ship, system) && (
        <Help topic="upgradeLimit">
          <Stepper
            label={texts.systems.upgradeLimit}
            value={system.max ?? max}
            min={1}
            max={max}
            onChange={(v) => setSystemUpgradeLimit(index, v)}
          />
        </Help>
      )}
      <Help topic="installed">
        <label className="ed-choice">
          <input
            type="checkbox"
            checked={isInstalled(system)}
            onChange={(e) => setSystemInstalled(index, e.target.checked)}
          />
          {texts.systems.installed}
        </label>
      </Help>
      {system.system === "artillery" && <ArtilleryWeapon index={index} weapon={system.weapon} />}
      {isStationSystem(system.system) && <StationFacing ship={ship} index={index} />}
      <InteriorPicker index={index} room={room} />
    </section>
  );
}

/** Cell numbers that medbay and clonebay keep (read only here). */
function useKeptCells(ship: Ship, room: Room): string[] {
  const texts = useTexts();
  const nameOf = useSystemName();
  return ship.blueprint.systems
    .filter((s) => s.room === room.id && !isStationSystem(s.system) && s.slot?.number !== undefined)
    .map((s) => texts.inspector.crewCell(nameOf(s.system), s.slot!.number!));
}

export function RoomSystems({ ship, room }: { ship: Ship; room: Room }) {
  const texts = useTexts();
  const kept = useKeptCells(ship, room);
  const indices = systemsInRoom(ship, room.id);
  const unusual = isUnusualMix(indices.map((i) => ship.blueprint.systems[i].system));
  return (
    <Section id="room-systems" title={texts.sections.roomSystems} count={String(indices.length)}>
      {unusual && <div className="ed-group ed-group--warn">{texts.systems.unusualMix}</div>}
      {indices.length === 0 && <span className="muted">{texts.systems.empty}</span>}
      {indices.map((i) => (
        <SystemCard key={ship.blueprint.systems[i].system} ship={ship} index={i} room={room} />
      ))}
      {kept.map((line, i) => (
        <span key={i} className="muted">
          {line}
        </span>
      ))}
    </Section>
  );
}
