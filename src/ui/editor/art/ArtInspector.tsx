/**
 * The Hull & art inspector: the selected mount or gib; otherwise the
 * pictures, the Move picture options, the explosion pieces and tool help.
 */
import { deleteSelectedArt } from "../../../app/artActions";
import type { MovablePicture } from "../../../app/art/pictures";
import { selectionSize, singleTarget } from "../../../app/selection";
import { currentTool, useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { GibPanel } from "./GibPanel";
import { MountPanel } from "./MountPanel";
import { PicturesPanel } from "./PicturesPanel";

const MOVABLE: MovablePicture[] = ["hull", "floor", "cloak", "shield"];

function MoveOptions() {
  const texts = useTexts();
  const options = useEditor((s) => s.artTool);
  const set = useEditor((s) => s.setArtTool);
  return (
    <fieldset className="ed-group ed-fieldset" aria-label={texts.art.moveOptions}>
      <legend className="eyebrow">{texts.art.moveWhich}</legend>
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
      <label className="ed-choice">
        <input
          type="checkbox"
          checked={options.keepMounts}
          onChange={(e) => set({ keepMounts: e.target.checked })}
        />
        {texts.art.keepMounts}
      </label>
    </fieldset>
  );
}

function Gibs() {
  const texts = useTexts();
  const count = useEditor((s) => s.doc?.history.present.ship.layoutXml.gibs.length ?? 0);
  return (
    <div className="ed-row">
      <span>{texts.art.gibsCount(count)}</span>
      <button
        type="button"
        className="btn btn--small"
        onClick={() => useEditor.getState().openPicturePicker({ newGib: true })}
      >
        {texts.art.addGib}
      </button>
    </div>
  );
}

function ToolHelp() {
  const texts = useTexts();
  const tool = useEditor(currentTool);
  const help = texts.art.toolHelp[tool as keyof typeof texts.art.toolHelp];
  if (!help) return null;
  return (
    <div className="ed-help">
      <span className="ed-help-title">{help.title}</span>
      <span>{help.body}</span>
    </div>
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
  const several = selection.mounts.length + selection.gibs.length;
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.art.eyebrow}</span>
        <span className="ed-heading-title">{texts.inspector.art.title}</span>
      </div>
      {several > 1 && selectionSize(selection) === several && (
        <div className="ed-row">
          <span>{texts.art.several(selection.mounts.length, selection.gibs.length)}</span>
          <button
            type="button"
            className="btn btn--small btn--danger"
            onClick={() => deleteSelectedArt()}
          >
            {texts.art.delete}
          </button>
        </div>
      )}
      {tool === "movePicture" && <MoveOptions />}
      <PicturesPanel />
      <span className="muted">{texts.art.mountsCount(ship.layoutXml.mounts.length)}</span>
      <Gibs />
      <ToolHelp />
    </>
  );
}
