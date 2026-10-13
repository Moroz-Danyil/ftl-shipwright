/**
 * Chooses a picture for the hull, floor, cloak, shield, ship icon or a gib:
 * the game's pictures of that kind (searchable, with previews), or a PNG file.
 */
import { useEffect, useMemo, useState } from "react";
import { listMiniships, listShipPictures, type GameView } from "../../../core";
import { choosePicture, pictureFromFile } from "../../../app/artActions";
import { gamePicture } from "../../../app/art/model";
import { useEditor, type PictureTarget } from "../../../app/store";
import { usePicture } from "../../../canvas/pictures";
import { usePlatform } from "../../../platform/PlatformContext";
import { useTexts, type Texts } from "../../../text";
import { Dialog } from "../../common/Dialog";

interface Choice {
  name: string;
  path: string;
}

async function choicesFor(view: GameView, target: PictureTarget): Promise<Choice[]> {
  if ("slot" in target && target.slot === "miniship") return listMiniships(view);
  const all = await listShipPictures(view);
  const kind = "slot" in target && target.slot !== "miniship" ? target.slot : "gib";
  return all[kind].map((p) => ({
    name: p.path.slice(p.path.lastIndexOf("/") + 1),
    path: p.path,
  }));
}

/** The pictures the game offers for a target; `undefined` while reading. */
function useChoices(
  view: GameView | undefined,
  target: PictureTarget | null
): Choice[] | undefined {
  const [loaded, setLoaded] = useState<{ target: PictureTarget; list: Choice[] }>();
  useEffect(() => {
    if (!view || !target) return;
    let live = true;
    void choicesFor(view, target).then((list) => {
      if (live) setLoaded({ target, list });
    });
    return () => {
      live = false;
    };
  }, [view, target]);
  return loaded?.target === target ? loaded.list : undefined;
}

function targetLabel(texts: Texts, target: PictureTarget): string {
  if ("newGib" in target) return texts.art.newGib;
  if ("gib" in target) return texts.art.gibName(target.gib + 1);
  return texts.art.slots[target.slot];
}

function ChoiceRow({
  view,
  choice,
  onPick,
}: {
  view: GameView;
  choice: Choice;
  onPick: () => void;
}) {
  const texts = useTexts();
  const picture = usePicture(view, choice.path);
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      className="picker-item"
      onClick={onPick}
    >
      <span className="ship-icon">{picture && <img src={picture.url} alt="" />}</span>
      <span className="picker-text">
        <span className="picker-name">{choice.name}</span>
        {picture && (
          <span className="picker-sub mono">
            {texts.art.pictureSize(picture.width, picture.height)}
          </span>
        )}
      </span>
    </button>
  );
}

export function PicturePicker() {
  const texts = useTexts();
  const platform = usePlatform();
  const view = useEditor((s) => s.game.data?.view);
  const target = useEditor((s) => s.pictureTarget);
  const choices = useChoices(view, target);
  const [query, setQuery] = useState("");
  const close = () => useEditor.getState().openDialog(null);
  const shown = useMemo(
    () => (choices ?? []).filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())),
    [choices, query]
  );
  if (!target) return null;

  const pick = async (ref: Parameters<typeof choosePicture>[1] | undefined) => {
    if (ref && (await choosePicture(target, ref, texts))) close();
  };

  return (
    <Dialog
      title={texts.art.choose(targetLabel(texts, target))}
      onClose={close}
      actions={
        <>
          <button
            type="button"
            className="btn"
            onClick={() => void pictureFromFile(platform, texts).then(pick)}
          >
            {texts.art.fromFile}
          </button>
          <button type="button" className="btn" onClick={close}>
            {texts.common.cancel}
          </button>
        </>
      }
    >
      <div className="picker">
        <label className="field">
          {texts.common.search}
          <input
            className="input"
            type="search"
            value={query}
            placeholder={texts.art.searchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="picker-list" role="listbox" aria-label={texts.common.search}>
          {view &&
            shown.map((choice) => (
              <ChoiceRow
                key={choice.path}
                view={view}
                choice={choice}
                onPick={() => void pick(gamePicture(choice.path))}
              />
            ))}
          {choices && shown.length === 0 && (
            <div className="picker-empty">{texts.art.noMatches}</div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
