/**
 * The palette of the game's systems in three groups. A chip shows where the
 * system is placed (amber when bought later); drag it onto a room, or click
 * it to put it in the selected room.
 */
import { PALETTE_ATTRIBUTE, clickSystem, pressSystemChip } from "../../../app/systemDrag";
import { SYSTEM_GROUPS, isInstalled, type SystemGroup } from "../../../app/systems/rules";
import { useSystemName } from "../../../app/names";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";

function Chip({ system }: { system: string }) {
  const texts = useTexts();
  const nameOf = useSystemName();
  const placed = useEditor((s) =>
    s.doc?.history.present.ship.blueprint.systems.find((x) => x.system === system)
  );
  const later = placed !== undefined && !isInstalled(placed);
  const className = ["sy-chip", placed ? "sy-chip--placed" : "", later ? "sy-chip--later" : ""]
    .filter((c) => c !== "")
    .join(" ");
  return (
    <button
      type="button"
      className={className}
      data-system={system}
      title={nameOf(system)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        pressSystemChip(system, { clientX: e.clientX, clientY: e.clientY }, texts);
      }}
      onClick={(e) => {
        // A click from the keyboard (Enter or Space); pointer clicks are handled on release.
        if (e.detail === 0) clickSystem(system, texts);
      }}
    >
      <span className="sy-chip-name">{nameOf(system)}</span>
      {placed && <span className="sy-chip-tag">{texts.systems.inRoom(placed.room)}</span>}
    </button>
  );
}

export function Palette() {
  const texts = useTexts();
  const groups = Object.entries(SYSTEM_GROUPS) as Array<[SystemGroup, string[]]>;
  return (
    <div className="sy-palette" {...{ [PALETTE_ATTRIBUTE]: "" }} aria-label={texts.systems.palette}>
      {groups.map(([group, systems]) => (
        <div key={group} className="sy-group" role="group" aria-label={texts.systems.groups[group]}>
          <span className="section-label">{texts.systems.groups[group]}</span>
          <div className="sy-chips">
            {systems.map((system) => (
              <Chip key={system} system={system} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
