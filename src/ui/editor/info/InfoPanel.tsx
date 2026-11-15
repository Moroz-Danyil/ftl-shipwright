/**
 * The Info panel on the right of the editor: it describes what was clicked
 * last (an item in a list, else the selection, else the ship itself) with
 * pictures and everything the game's data says about it. It only shows;
 * editing stays in the inspector. A button in its header folds it to a thin
 * strip, which gives the canvas the room back; the strip's button opens it
 * again, and the choice is remembered between runs.
 */
import { infoSubject, type InfoSubject } from "../../../app/info";
import { useEditor } from "../../../app/store";
import type { Ship } from "../../../core";
import { useTexts } from "../../../text";
import { ChevronIcon } from "../../common/icons";
import { Pictogram } from "../../common/Pictogram";
import { GibInfo, MountInfo } from "./ArtInfo";
import { ItemInfo, RaceInfo, SeveralInfo, SlotInfo } from "./ItemInfo";
import { DoorInfo, RoomInfo, StationInfo, SystemInfo } from "./LayoutInfo";
import { ShipSummary } from "./ShipSummary";

function SubjectPage({ ship, subject }: { ship: Ship; subject: InfoSubject }) {
  switch (subject.kind) {
    case "room":
      return <RoomInfo ship={ship} id={subject.id} />;
    case "door":
      return <DoorInfo ship={ship} index={subject.index} />;
    case "station":
      return <StationInfo ship={ship} system={subject.system} />;
    case "mount":
      return <MountInfo ship={ship} index={subject.index} />;
    case "gib":
      return <GibInfo ship={ship} index={subject.index} />;
    case "weapon":
    case "drone":
      return <SlotInfo ship={ship} kind={subject.kind} index={subject.index} />;
    case "system":
      return <SystemInfo ship={ship} system={subject.system} />;
    case "item":
      return <ItemInfo ship={ship} kind={subject.item} name={subject.name} />;
    case "race":
      return <RaceInfo ship={ship} race={subject.race} />;
    case "several":
      return <SeveralInfo selection={subject.selection} />;
    case "ship":
      return <ShipSummary ship={ship} />;
  }
}

/** A key for the page, so a new subject starts at the top of the panel. */
function subjectKey(subject: InfoSubject): string {
  return JSON.stringify(subject);
}

export function InfoPanel() {
  const texts = useTexts();
  const open = useEditor((s) => s.infoPanelOpen);
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const selection = useEditor((s) => s.selection);
  const pick = useEditor((s) => s.infoPick);
  const workspace = useEditor((s) => s.workspace);
  const setOpen = useEditor((s) => s.setInfoPanelOpen);
  if (!ship) return null;
  if (!open)
    return (
      <aside className="ed-info ed-info--folded" aria-label={texts.info.label} data-tour="info">
        <button
          type="button"
          className="btn btn--icon ed-info-toggle"
          aria-label={texts.info.open}
          aria-expanded={false}
          title={texts.info.open}
          onClick={() => setOpen(true)}
        >
          <span className="ed-info-chevron ed-info-chevron--open">
            <ChevronIcon />
          </span>
        </button>
        <span className="ed-info-strip-label" aria-hidden="true">
          <Pictogram id="info" size={20} />
          {texts.info.label}
        </span>
      </aside>
    );
  const subject = infoSubject(selection, pick, workspace);
  return (
    <aside className="ed-info" aria-label={texts.info.label} data-tour="info">
      <div className="ed-info-bar">
        <span className="ed-info-title">
          <Pictogram id="info" size={20} />
          {texts.info.label}
        </span>
        <button
          type="button"
          className="btn btn--icon ed-info-toggle"
          aria-label={texts.info.fold}
          aria-expanded={true}
          title={texts.info.fold}
          onClick={() => setOpen(false)}
        >
          <span className="ed-info-chevron">
            <ChevronIcon />
          </span>
        </button>
      </div>
      <div className="ed-info-body" key={subjectKey(subject)} data-subject={subject.kind}>
        <SubjectPage ship={ship} subject={subject} />
      </div>
    </aside>
  );
}
