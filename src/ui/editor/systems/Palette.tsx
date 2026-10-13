/**
 * The palette of the game's systems in three groups, under a legend of the
 * colours. A tile is green when the system is installed at the start, amber
 * when it is on the ship but bought later, red when the ship lacks it, and
 * shows the room it is in; hovering it shows the system's description and
 * power beside the inspector. Drag a tile onto a room, or click it to put the
 * system in the selected room.
 */
import { PALETTE_ATTRIBUTE, clickSystem, pressSystemChip } from "../../../app/systemDrag";
import { SYSTEM_GROUPS, isInstalled, type SystemGroup } from "../../../app/systems/rules";
import { gameText } from "../../../app/loadout/catalog";
import { useSystemName } from "../../../app/names";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { HoverPanel } from "../../common/HoverPanel";
import { Section } from "../../common/Section";
import { SystemIcon } from "../../common/SystemIcon";
import { useHoverPanel } from "../../common/useHoverPanel";

type TileState = "start" | "later" | "missing";

const STATES: TileState[] = ["start", "later", "missing"];

function Tile({ system }: { system: string }) {
  const texts = useTexts();
  const nameOf = useSystemName();
  const placed = useEditor((s) =>
    s.doc?.history.present.ship.blueprint.systems.find((x) => x.system === system)
  );
  const data = useEditor((s) => s.game.data);
  const panel = useHoverPanel<true>();
  const state: TileState = !placed ? "missing" : isInstalled(placed) ? "start" : "later";
  const name = nameOf(system);
  const entry = data?.catalogs.systems.find((s) => s.name === system);
  const desc = gameText(data, entry?.desc);
  const start = placed?.power ?? entry?.startPower;
  const title = placed ? texts.systems.nameInRoom(name, placed.room) : name;
  return (
    <button
      type="button"
      className={`sy-tile sy-tile--${state}`}
      data-system={system}
      data-state={state}
      onPointerEnter={(e) => panel.show(true, e.currentTarget)}
      onPointerLeave={panel.hide}
      onFocus={(e) => panel.show(true, e.currentTarget)}
      onBlur={panel.hide}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        panel.hide();
        pressSystemChip(system, { clientX: e.clientX, clientY: e.clientY }, texts);
      }}
      onClick={(e) => {
        // A click from the keyboard (Enter or Space); pointer clicks are handled on release.
        if (e.detail === 0) clickSystem(system, texts);
      }}
    >
      <SystemIcon system={system} size={28} />
      <span className="sy-tile-name">{name}</span>
      {placed && <span className="sy-tile-room">{texts.systems.roomTag(placed.room)}</span>}
      {state === "later" && <span className="sy-tile-state">{texts.systems.notAtStart}</span>}
      {panel.shown && (
        <HoverPanel anchor={panel.shown.anchor} picture={<SystemIcon system={system} size={64} />}>
          <section className="lo-details" aria-label={title}>
            <span className="lo-details-title">{title}</span>
            <span className={`sy-state-line sy-state-line--${state}`}>
              {texts.systems.states[state]}
            </span>
            {desc && <p className="lo-details-text muted">{desc}</p>}
            <dl className="lo-stats">
              {start !== undefined && (
                <div className="ed-row">
                  <dt>{texts.systems.startingPower}</dt>
                  <dd className="mono">{start}</dd>
                </div>
              )}
              {entry?.maxPower !== undefined && (
                <div className="ed-row">
                  <dt>{texts.systems.maxPower}</dt>
                  <dd className="mono">{entry.maxPower}</dd>
                </div>
              )}
            </dl>
          </section>
        </HoverPanel>
      )}
    </button>
  );
}

function Legend() {
  const texts = useTexts();
  return (
    <ul className="sy-legend" aria-label={texts.systems.legend}>
      {STATES.map((state) => (
        <li key={state}>
          <span className={`sy-swatch sy-tile--${state}`} aria-hidden="true" />
          {texts.systems.states[state]}
        </li>
      ))}
    </ul>
  );
}

export function Palette() {
  const texts = useTexts();
  const groups = Object.entries(SYSTEM_GROUPS) as Array<[SystemGroup, string[]]>;
  return (
    <div className="sy-palette" {...{ [PALETTE_ATTRIBUTE]: "" }} aria-label={texts.systems.palette}>
      <Legend />
      {groups.map(([group, systems]) => (
        <div key={group} className="sy-group" role="group" aria-label={texts.systems.groups[group]}>
          <span className="section-label">{texts.systems.groups[group]}</span>
          <div className="sy-tiles">
            {systems.map((system) => (
              <Tile key={system} system={system} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The "Add a system" section: the palette and a line on how to use it. */
export function AddSystem({ hint }: { hint: string }) {
  const texts = useTexts();
  return (
    <Section id="rooms-palette" title={texts.sections.addSystem} icon="addSystem">
      <Palette />
      <span className="ed-help">{hint}</span>
    </Section>
  );
}
