/**
 * The Info panel's pages for the parts of the layout: a room (its systems, the
 * crew at its station, its size and doors), a system (from a palette tile or a
 * system card), a door and a crew station.
 */
import { CELL_SIZE, doorRooms, stationCellToXY, type Room, type Ship } from "../../../core";
import { doorsOfRoom } from "../../../app/layout/doors";
import { DIRECTIONS, isStationSystem, stationOf } from "../../../app/layout/stations";
import { systemLevels } from "../../../app/info";
import { gameText } from "../../../app/loadout/catalog";
import { useSystemName } from "../../../app/names";
import { useEditor } from "../../../app/store";
import { isInstalled, systemIndex, systemsInRoom } from "../../../app/systems/rules";
import { doorKind } from "../../../canvas/doors";
import { stationCrew, stationCrewFrame, systemIconPath } from "../../../canvas/gameLook";
import { usePicture } from "../../../canvas/pictures";
import { SheetSprite } from "../../../canvas/SheetSprite";
import { useTexts, type Texts } from "../../../text";
import { StationCrewPicture } from "../../common/ItemPictures";
import { SystemIcon } from "../../common/SystemIcon";
import { Facts, InfoHead, InfoPicture, InfoSection, InfoText } from "./InfoParts";

type SystemState = "start" | "later" | "missing";

/** The way a station faces, as the inspector names it; a direction it does not know as it is. */
function facingName(texts: Texts, direction: string): string {
  const known = DIRECTIONS.find((d) => d === direction);
  return known ? texts.inspector.directions[known] : direction;
}

function useRaceTitle(): (race: string) => string {
  const data = useEditor((s) => s.game.data);
  return (race) => gameText(data, data?.catalogs.races.find((r) => r.name === race)?.title) || race;
}

/** The race manning a system's station: a race, `null` when nobody is left, absent without a station. */
function stationRace(ship: Ship, index: number): string | null | undefined {
  const entry = stationCrew(ship).find((c) => c.system === index);
  return entry ? entry.race : undefined;
}

/** What the game says about a system: its state, description, power and levels. */
function SystemFacts({ ship, system }: { ship: Ship; system: string }) {
  const texts = useTexts();
  const t = texts.info;
  const data = useEditor((s) => s.game.data);
  const placed = ship.blueprint.systems.find((s) => s.system === system);
  const entry = data?.catalogs.systems.find((s) => s.name === system);
  const state: SystemState = !placed ? "missing" : isInstalled(placed) ? "start" : "later";
  const desc = gameText(data, entry?.desc);
  const start = placed?.power ?? entry?.startPower;
  const levels = systemLevels(data?.texts, system);
  return (
    <>
      <span className={`sy-state-line sy-state-line--${state}`}>{texts.systems.states[state]}</span>
      {desc && <InfoText>{desc}</InfoText>}
      <Facts
        rows={[
          [t.startingPower, start],
          [t.maxPower, entry?.maxPower],
          [t.upgradeLimit, placed?.max],
        ]}
      />
      {levels.length > 0 && (
        <dl className="lo-stats info-levels" aria-label={t.sections.levels}>
          {levels.map(({ level, text }) => (
            <div
              key={level}
              className="ed-row"
              data-reached={start !== undefined && level <= start ? true : undefined}
            >
              <dt>{t.level(level)}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}

/** One system of a room: its icon, name and what the game says about it. */
function SystemBlock({ ship, system }: { ship: Ship; system: string }) {
  const nameOf = useSystemName();
  return (
    <div className="info-card" data-system={system}>
      <span className="info-card-title">
        <SystemIcon system={system} size={40} />
        <span>{nameOf(system)}</span>
      </span>
      <SystemFacts ship={ship} system={system} />
    </div>
  );
}

/** Who mans a system's station, with their sprite as the canvas draws them. */
function StationCrew({ ship, index }: { ship: Ship; index: number }) {
  const texts = useTexts();
  const raceTitle = useRaceTitle();
  const nameOf = useSystemName();
  const station = stationOf(ship, index);
  const race = stationRace(ship, index);
  const system = ship.blueprint.systems[index].system;
  if (!station) return null;
  return (
    <div className="info-crew" data-crew={race ?? "none"}>
      <span className="info-crew-pic">
        {race ? (
          <StationCrewPicture race={race} direction={station.slot.direction} size={48} />
        ) : (
          <span className="info-seat" />
        )}
      </span>
      <span className="info-crew-text">
        <span>{race ? raceTitle(race) : texts.info.noCrew}</span>
        <span className="muted">
          {[
            texts.inspector.station(nameOf(system)),
            station.slot.direction === undefined
              ? undefined
              : facingName(texts, station.slot.direction),
          ]
            .filter((part) => part !== undefined)
            .join(" · ")}
        </span>
      </span>
    </div>
  );
}

/** The room drawn small: its cells, the icon of its first system and the crew at its stations. */
function RoomSketch({ ship, room }: { ship: Ship; room: Room }) {
  const view = useEditor((s) => s.game.data?.view);
  const animations = useEditor((s) => s.game.data?.animations);
  const indices = systemsInRoom(ship, room.id);
  const first = indices[0] !== undefined ? ship.blueprint.systems[indices[0]].system : undefined;
  const icon = usePicture(view, first ? systemIconPath(first) : undefined);
  const w = room.w * CELL_SIZE;
  const h = room.h * CELL_SIZE;
  const crew = stationCrew(ship).filter((c) => indices.includes(c.system) && c.race !== null);
  return (
    <svg
      className="info-room"
      viewBox={`-2 -2 ${w + 4} ${h + 4}`}
      width={Math.min(260, (w + 4) * 3)}
      height={Math.min(128, (h + 4) * 3)}
      aria-hidden="true"
    >
      <rect className="info-room-floor" x={0} y={0} width={w} height={h} />
      {Array.from({ length: room.w - 1 }, (_, i) => (
        <line
          key={`x${i}`}
          className="info-room-tile"
          x1={(i + 1) * CELL_SIZE}
          y1={0}
          x2={(i + 1) * CELL_SIZE}
          y2={h}
        />
      ))}
      {Array.from({ length: room.h - 1 }, (_, i) => (
        <line
          key={`y${i}`}
          className="info-room-tile"
          x1={0}
          y1={(i + 1) * CELL_SIZE}
          x2={w}
          y2={(i + 1) * CELL_SIZE}
        />
      ))}
      <rect className="info-room-wall" x={0} y={0} width={w} height={h} />
      {icon && <image href={icon.url} x={w / 2 - 16} y={h / 2 - 16} width={32} height={32} />}
      {animations &&
        crew.map(({ system, race }) => {
          const station = stationOf(ship, system)!;
          const frame = stationCrewFrame(animations, race!, station.slot.direction);
          const cell = stationCellToXY(room, station.slot.number);
          return frame ? (
            <SheetSprite
              key={system}
              path={frame.path}
              frame={frame.rect}
              x={cell.x * CELL_SIZE}
              y={cell.y * CELL_SIZE}
            />
          ) : null;
        })}
    </svg>
  );
}

export function RoomInfo({ ship, id }: { ship: Ship; id: number }) {
  const texts = useTexts();
  const t = texts.info;
  const room = ship.layout.rooms.find((r) => r.id === id);
  if (!room) return null;
  const indices = systemsInRoom(ship, room.id);
  const stations = indices.filter((i) => isStationSystem(ship.blueprint.systems[i].system));
  const doors = doorsOfRoom(ship.layout, room.id);
  const side = (other: number) => (other === -1 ? t.airlockTo : texts.inspector.side(other));
  return (
    <>
      <InfoHead kind={t.kinds.room} title={texts.inspector.room(room.id)} />
      <InfoPicture>
        <RoomSketch ship={ship} room={room} />
      </InfoPicture>
      <InfoSection title={t.sections.systems} icon="roomSystems">
        {indices.length === 0 && <InfoText muted>{t.noSystems}</InfoText>}
        {indices.map((i) => (
          <SystemBlock
            key={ship.blueprint.systems[i].system}
            ship={ship}
            system={ship.blueprint.systems[i].system}
          />
        ))}
      </InfoSection>
      {stations.length > 0 && (
        <InfoSection title={t.sections.crew} icon="crew">
          {stations.map((i) => (
            <StationCrew key={i} ship={ship} index={i} />
          ))}
          {stations.every((i) => !stationOf(ship, i)) && <InfoText muted>{t.noStation}</InfoText>}
        </InfoSection>
      )}
      <InfoSection title={t.sections.position} icon="position">
        <Facts
          rows={[
            [t.position, t.cellsAt(room.x, room.y)],
            [t.size, t.cells(room.w, room.h)],
            [texts.inspector.roomId, room.id],
          ]}
        />
      </InfoSection>
      <InfoSection title={t.sections.doors} icon="door">
        {doors.length === 0 ? (
          <InfoText muted>{t.noDoors}</InfoText>
        ) : (
          <ul className="info-list">
            {doors.map((index) => {
              const [a, b] = doorRooms(ship.layout, ship.layout.doors[index]);
              const other = a === room.id ? b : a;
              return (
                <li key={index} data-airlock={other === -1 || undefined}>
                  {t.doorTo(index, side(other))}
                </li>
              );
            })}
          </ul>
        )}
      </InfoSection>
    </>
  );
}

export function SystemInfo({ ship, system }: { ship: Ship; system: string }) {
  const texts = useTexts();
  const t = texts.info;
  const nameOf = useSystemName();
  const index = systemIndex(ship, system);
  const placed = ship.blueprint.systems[index];
  return (
    <>
      <InfoHead kind={t.kinds.system} title={nameOf(system)} sub={system} id />
      <InfoPicture>
        <SystemIcon system={system} size={96} />
      </InfoPicture>
      <InfoSection title={t.sections.item} icon="info">
        <SystemFacts ship={ship} system={system} />
      </InfoSection>
      <InfoSection title={t.sections.rooms} icon="room">
        {placed ? (
          <Facts
            rows={[
              [t.room, texts.inspector.room(placed.room)],
              [
                t.state,
                isInstalled(placed) ? texts.systems.states.start : texts.systems.states.later,
              ],
            ]}
          />
        ) : (
          <InfoText muted>{t.notOnShip}</InfoText>
        )}
      </InfoSection>
      {placed && isStationSystem(system) && (
        <InfoSection title={t.sections.crew} icon="crew">
          {stationOf(ship, index) ? (
            <StationCrew ship={ship} index={index} />
          ) : (
            <InfoText muted>{t.noSystemStation}</InfoText>
          )}
        </InfoSection>
      )}
    </>
  );
}

/** A door drawn small: the two cells it joins, the space side dark, an airlock blue. */
function DoorSketch({ vertical, kind }: { vertical: boolean; kind: string }) {
  const c = CELL_SIZE;
  const [w, h] = vertical ? [2 * c, c] : [c, 2 * c];
  const door = vertical
    ? { x: c - 3, y: c / 2 - 8, width: 6, height: 16 }
    : { x: c / 2 - 8, y: c - 3, width: 16, height: 6 };
  const second = vertical ? { x: c, y: 0 } : { x: 0, y: c };
  return (
    <svg
      className="info-room"
      viewBox={`-2 -2 ${w + 4} ${h + 4}`}
      width={(w + 4) * 1.6}
      height={(h + 4) * 1.6}
      aria-hidden="true"
    >
      <rect className="info-room-floor" x={0} y={0} width={c} height={c} />
      <rect
        className={kind === "inner" ? "info-room-floor" : "info-room-space"}
        x={second.x}
        y={second.y}
        width={c}
        height={c}
      />
      <rect className="info-room-wall" x={0} y={0} width={c} height={c} />
      {kind === "inner" && (
        <rect className="info-room-wall" x={second.x} y={second.y} width={c} height={c} />
      )}
      <rect className={`info-door info-door--${kind}`} {...door} rx={1} />
    </svg>
  );
}

export function DoorInfo({ ship, index }: { ship: Ship; index: number }) {
  const texts = useTexts();
  const t = texts.info;
  const door = ship.layout.doors[index];
  if (!door) return null;
  const kind = doorKind(ship.layout, door);
  const [a, b] = doorRooms(ship.layout, door);
  const side = (id: number) => (id === -1 ? texts.inspector.space : texts.inspector.side(id));
  const room = ship.layout.rooms.find((r) => r.id === a);
  const large = kind === "airlock" && room !== undefined && (room.w > 2 || room.h > 2);
  return (
    <>
      <InfoHead
        kind={kind === "airlock" ? t.kinds.airlock : t.kinds.door}
        title={texts.inspector.door(index)}
      />
      <InfoPicture>
        <DoorSketch vertical={door.vertical} kind={kind} />
      </InfoPicture>
      <InfoSection title={t.sections.door} icon="door">
        <Facts
          rows={[
            [t.kind, t.doorKinds[kind]],
            [t.connects, kind === "loose" ? undefined : `${side(a)} · ${side(b)}`],
            [t.wall, door.vertical ? texts.inspector.verticalWall : texts.inspector.horizontalWall],
            [t.position, t.cellsAt(door.x, door.y)],
          ]}
        />
        {kind === "inner" && <InfoText>{t.innerAbout}</InfoText>}
        {kind === "airlock" && <InfoText>{t.airlockAbout}</InfoText>}
        {large && <div className="ed-group ed-group--warn">{texts.inspector.largeAirlock}</div>}
        {kind === "loose" && (
          <div className="ed-group ed-group--problem">{texts.inspector.loose}</div>
        )}
      </InfoSection>
    </>
  );
}

export function StationInfo({ ship, system }: { ship: Ship; system: number }) {
  const texts = useTexts();
  const t = texts.info;
  const nameOf = useSystemName();
  const raceTitle = useRaceTitle();
  const station = stationOf(ship, system);
  if (!station) return null;
  const id = ship.blueprint.systems[system].system;
  const race = stationRace(ship, system);
  const direction = station.slot.direction;
  return (
    <>
      <InfoHead kind={t.kinds.station} title={texts.inspector.station(nameOf(id))} />
      <InfoPicture>
        {race ? (
          <StationCrewPicture race={race} direction={direction} size={105} />
        ) : (
          <span className="info-seat info-seat--large" />
        )}
      </InfoPicture>
      <InfoSection title={t.sections.station} icon="station">
        <Facts
          rows={[
            [t.system, nameOf(id)],
            [t.room, texts.inspector.room(station.room.id)],
            [t.cell, station.slot.number],
            [t.facing, direction === undefined ? undefined : facingName(texts, direction)],
            [t.crewMember, race ? raceTitle(race) : undefined],
          ]}
        />
        {!race && <InfoText muted>{t.noCrew}</InfoText>}
      </InfoSection>
    </>
  );
}
