/**
 * The Info panel with nothing selected: a short summary of the ship (hull,
 * reactor, slots, crew, rooms, doors and systems), the overview's counts with
 * a button that opens it, and for a ship without rooms the next step.
 */
import type { Ship } from "../../../core";
import { keyLabel } from "../../../app/keys";
import { LIMITS as SHIP_LIMITS, NEW_SHIP_HULL, crewTotal } from "../../../app/details/rules";
import { gameText } from "../../../app/loadout/catalog";
import { items, slots } from "../../../app/loadout/rules";
import { useSystemName } from "../../../app/names";
import { overviewCounts, useOverview } from "../../../app/overview";
import { useEditor } from "../../../app/store";
import { usePictureRef } from "../../../canvas/pictures";
import { useTexts } from "../../../text";
import { SystemIcon } from "../../common/SystemIcon";
import { Facts, InfoHead, InfoPicture, InfoSection, InfoText } from "./InfoParts";

function NextStep() {
  const texts = useTexts();
  const keys = useEditor((s) => s.keys);
  const workspace = useEditor((s) => s.workspace);
  const e = texts.canvas.emptyShip;
  return (
    <InfoSection title={texts.info.sections.nextStep} icon="room">
      <span className="info-text">{e.title}</span>
      <ol className="info-steps">
        <li>{e.rooms(keyLabel(keys["tool.room"]))}</li>
        <li>{e.doors(keyLabel(keys["tool.door"]))}</li>
        <li>{e.systems}</li>
      </ol>
      {workspace !== "rooms" && (
        <div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const state = useEditor.getState();
              state.setWorkspace("rooms");
              state.setTool("room");
            }}
          >
            {texts.info.startRooms}
          </button>
        </div>
      )}
    </InfoSection>
  );
}

function Checks() {
  const texts = useTexts();
  const t = texts.info;
  const { problems, checks } = overviewCounts(useOverview());
  return (
    <InfoSection title={t.sections.checks} icon="stats">
      {problems + checks === 0 ? (
        <InfoText>{t.allGood}</InfoText>
      ) : (
        <Facts
          rows={[
            [
              t.problems,
              problems > 0 ? <span className="info-problem">{problems}</span> : undefined,
            ],
            [t.toCheck, checks > 0 ? <span className="info-check">{checks}</span> : undefined],
          ]}
        />
      )}
      <div>
        <button
          type="button"
          className="btn"
          onClick={() => useEditor.getState().openDialog("overview")}
        >
          {t.openOverview}
        </button>
      </div>
    </InfoSection>
  );
}

export function ShipSummary({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const t = texts.info;
  const data = useEditor((s) => s.game.data);
  const art = useEditor((s) => s.doc?.history.present.art);
  const hull = usePictureRef(art?.source, art?.hull);
  const nameOf = useSystemName();
  const bp = ship.blueprint;
  const name = gameText(data, bp.texts.name) || bp.name;
  const className = gameText(data, bp.texts.class);
  const count = (kind: "weapon" | "drone") =>
    texts.sections.count(items(ship, kind).length, slots(ship, kind));
  const empty = ship.layout.rooms.length === 0;
  return (
    <>
      <InfoHead kind={t.kinds.ship} title={name} sub={className || bp.name} id={!className} />
      {hull && (
        <InfoPicture>
          <img className="info-pic-img" src={hull.url} alt="" />
        </InfoPicture>
      )}
      <InfoSection title={t.sections.ship} icon="stats">
        <Facts
          rows={[
            [t.hull, bp.health ?? NEW_SHIP_HULL],
            [t.reactor, bp.maxPower ?? SHIP_LIMITS.reactor.min],
            [t.weaponSlots, count("weapon")],
            [t.droneSlots, count("drone")],
            [t.crew, texts.sections.count(crewTotal(ship), SHIP_LIMITS.crew)],
            [t.rooms, ship.layout.rooms.length],
            [t.doors, ship.layout.doors.length],
            [t.systems, bp.systems.length],
          ]}
        />
        {bp.systems.length > 0 && (
          <ul className="info-systems" aria-label={t.systems}>
            {bp.systems.map((s) => (
              <li key={s.system} title={nameOf(s.system)} aria-label={nameOf(s.system)}>
                <SystemIcon system={s.system} size={28} />
              </li>
            ))}
          </ul>
        )}
      </InfoSection>
      {empty && <NextStep />}
      <Checks />
      {!empty && <InfoText muted>{t.hintSelect}</InfoText>}
    </>
  );
}
