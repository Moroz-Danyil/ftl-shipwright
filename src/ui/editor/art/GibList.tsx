/**
 * The explosion pieces as a list: each with its picture, Change and remove;
 * a click on a piece selects it on the ship. "Add gib…" adds a new one.
 */
import { removeGib } from "../../../app/artActions";
import { selectionOf } from "../../../app/selection";
import { useEditor } from "../../../app/store";
import { usePictureRef } from "../../../canvas/pictures";
import { useTexts } from "../../../text";
import { CrossIcon } from "../../common/icons";
import { Section } from "../../common/Section";

function GibRow({ index }: { index: number }) {
  const texts = useTexts();
  const source = useEditor((s) => s.doc?.history.present.art.source);
  const picture = useEditor((s) => s.doc?.history.present.art.gibs[index]);
  const loaded = usePictureRef(source, picture ?? undefined);
  const name = texts.art.gibName(index + 1);
  return (
    <div className="ar-gib" data-gib={index}>
      <button
        type="button"
        className="ar-gib-main"
        aria-label={texts.art.selectGib(index + 1)}
        onClick={() => useEditor.getState().select(selectionOf({ kind: "gib", index }))}
      >
        <span className="ar-thumb">{loaded && <img src={loaded.url} alt="" />}</span>
        <span>{name}</span>
      </button>
      <button
        type="button"
        className="btn btn--small"
        aria-label={texts.art.changeNamed(name)}
        onClick={() => useEditor.getState().openPicturePicker({ gib: index })}
      >
        {texts.art.change}
      </button>
      <button
        type="button"
        className="btn btn--icon btn--small"
        aria-label={texts.art.removeNamed(name)}
        onClick={() => removeGib(index)}
      >
        <CrossIcon />
      </button>
    </div>
  );
}

export function GibList() {
  const texts = useTexts();
  const count = useEditor((s) => s.doc?.history.present.ship.layoutXml.gibs.length ?? 0);
  return (
    <Section id="art-gibs" title={texts.sections.gibs} count={String(count)}>
      {Array.from({ length: count }, (_, i) => (
        <GibRow key={i} index={i} />
      ))}
      <button
        type="button"
        className="btn"
        onClick={() => useEditor.getState().openPicturePicker({ newGib: true })}
      >
        {texts.art.addGib}
      </button>
    </Section>
  );
}
