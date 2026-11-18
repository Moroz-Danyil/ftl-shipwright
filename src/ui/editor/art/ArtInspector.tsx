/**
 * The Hull inspector: the selected mount or gib; otherwise, for several
 * things of any kind, how many of each with Duplicate and Delete, then the
 * pictures, the Move picture options, the mounts, the explosion pieces and
 * tool help, each in a section that folds away.
 */
import type { MovablePicture } from "../../../app/art/pictures";
import { hasCanvasThings } from "../../../app/layoutActions";
import { canvasCounts, selectionSize, singleTarget } from "../../../app/selection";
import { PICTURES_SECTION, currentTool, useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { Help } from "../../common/Help";
import { Section } from "../../common/Section";
import { DeleteButton } from "../layout/DeleteButton";
import { ToolHelp } from "../layout/ToolHelp";
import { GibList } from "./GibList";
import { GibPanel } from "./GibPanel";
import { MountList } from "./MountList";
import { MountPanel } from "./MountPanel";
import { PicturesPanel } from "./PicturesPanel";

const MOVABLE: MovablePicture[] = ["hull", "floor", "cloak", "shield"];

function MoveOptions() {
  const texts = useTexts();
  const options = useEditor((s) => s.artTool);
  const set = useEditor((s) => s.setArtTool);
  return (
    <Section id="art-move" title={texts.art.moveWhich} icon="movePicture">
      <Help topic="moveWhich">
        <fieldset className="ed-fieldset" aria-label={texts.art.moveOptions}>
          {(["auto", ...MOVABLE] as const).map((picture) => (
            <label key={picture} className="ed-choice">
              <input
                type="radio"
                name="move-picture"
                checked={options.picture === picture}
                onChange={() => set({ picture })}
              />
              {picture === "auto" ? texts.art.moveAuto : texts.art.slots[picture]}
            </label>
          ))}
        </fieldset>
      </Help>
      <Help topic="keepMounts">
        <label className="ed-choice">
          <input
            type="checkbox"
            checked={options.keepMounts}
            onChange={(e) => set({ keepMounts: e.target.checked })}
          />
          {texts.art.keepMounts}
        </label>
      </Help>
    </Section>
  );
}

export function ArtInspector() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const selection = useEditor((s) => s.selection);
  const tool = useEditor(currentTool);
  if (!ship) return null;
  const target = singleTarget(selection);
  if (target?.kind === "mount") return <MountPanel ship={ship} index={target.index} />;
  if (target?.kind === "gib") return <GibPanel ship={ship} index={target.index} />;
  const several = selectionSize(selection) > 1;
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.hull.eyebrow}</span>
        <span className="ed-heading-title">{texts.inspector.hull.title}</span>
      </div>
      {several && (
        <div className="ed-row">
          <span>{texts.inspector.severalParts(canvasCounts(selection))}</span>
          {hasCanvasThings(selection) && <DeleteButton small />}
        </div>
      )}
      {tool === "movePicture" && <MoveOptions />}
      <Section id={PICTURES_SECTION} title={texts.sections.pictures} icon="pictures">
        <PicturesPanel />
      </Section>
      <MountList />
      <GibList />
      <ToolHelp />
    </>
  );
}
