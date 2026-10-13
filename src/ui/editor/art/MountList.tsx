/**
 * The weapon mounts as a list: each with the weapon drawn on it (from the
 * weapon list) and remove; a click on a mount selects it on the ship. The
 * Mount tool adds mounts.
 */
import { removeMountAt } from "../../../app/artActions";
import { findItem, itemTitle } from "../../../app/loadout/catalog";
import { selectionOf } from "../../../app/selection";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { CrossIcon } from "../../common/icons";
import { WeaponPicture } from "../../common/ItemPictures";
import { Section } from "../../common/Section";

function MountRow({ index }: { index: number }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const weapon = useEditor((s) => s.doc?.history.present.ship.blueprint.weaponList?.items[index]);
  const name = texts.art.mount(index + 1);
  const item = weapon === undefined ? undefined : findItem(data, "weapon", weapon);
  const title = item ? itemTitle(data, item) : weapon;
  return (
    <div className="ar-gib" data-mount={index}>
      <button
        type="button"
        className="ar-gib-main"
        aria-label={texts.art.selectMount(index + 1)}
        onClick={() => useEditor.getState().select(selectionOf({ kind: "mount", index }))}
      >
        <span className="ar-thumb">{weapon && <WeaponPicture name={weapon} size={36} />}</span>
        <span className="ar-picture-text">
          <span>{name}</span>
          <span className="muted">{title ?? texts.art.mountEmpty}</span>
        </span>
      </button>
      <button
        type="button"
        className="btn btn--icon btn--small"
        aria-label={texts.art.removeNamed(name)}
        onClick={() => removeMountAt(index)}
      >
        <CrossIcon />
      </button>
    </div>
  );
}

export function MountList() {
  const texts = useTexts();
  const count = useEditor((s) => s.doc?.history.present.ship.layoutXml.mounts.length ?? 0);
  return (
    <Section
      id="art-mounts"
      title={texts.sections.mounts}
      icon="mounts"
      count={texts.sections.count(count, 8)}
    >
      {Array.from({ length: count }, (_, i) => (
        <MountRow key={i} index={i} />
      ))}
      <span className="ed-help">{texts.sections.mountsHint}</span>
    </Section>
  );
}
