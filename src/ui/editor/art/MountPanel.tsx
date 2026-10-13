/**
 * The selected weapon mount: its number (the weapon slot drawn on it), the
 * weapon equipped there, its order, rotate and mirror, how the weapon slides
 * out, the gib it flies off with, its position and Delete.
 */
import type { Ship } from "../../../core";
import {
  deleteSelectedArt,
  linkMountGib,
  mirrorMount,
  placeMount,
  reorderMount,
  rotateMount,
  slideMount,
} from "../../../app/artActions";
import { SLIDES } from "../../../app/art/mounts";
import { findItem, itemTitle } from "../../../app/loadout/catalog";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { Help } from "../../common/Help";
import { NumberField } from "../../common/NumberField";

export function MountPanel({ ship, index }: { ship: Ship; index: number }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const mount = ship.layoutXml.mounts[index];
  if (!mount) return null;
  const weapon = ship.blueprint.weaponList?.items[index];
  const item = weapon === undefined ? undefined : findItem(data, "weapon", weapon);
  const count = ship.layoutXml.mounts.length;
  const slides: string[] = [...SLIDES];
  if (mount.slide !== undefined && !slides.includes(mount.slide)) slides.push(mount.slide);
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.art.selectedMount}</span>
        <span className="ed-heading-title">{texts.art.mount(index + 1)}</span>
        <span className="muted">
          {weapon
            ? texts.art.weaponHere(item ? itemTitle(data, item) : weapon)
            : texts.art.noWeapon}
        </span>
      </div>
      <Help topic="mountOrder">
        <div className="ed-row">
          <button
            type="button"
            className="btn"
            disabled={index === 0}
            onClick={() => reorderMount(index, -1)}
          >
            {texts.art.earlier}
          </button>
          <button
            type="button"
            className="btn"
            disabled={index === count - 1}
            onClick={() => reorderMount(index, 1)}
          >
            {texts.art.later}
          </button>
        </div>
      </Help>
      <div className="ed-row">
        <Help topic="mountRotate">
          <button
            type="button"
            className={mount.rotate ? "btn btn--on" : "btn"}
            aria-pressed={mount.rotate}
            onClick={() => rotateMount(index)}
          >
            {texts.art.rotate}
          </button>
        </Help>
        <Help topic="mountMirror">
          <button
            type="button"
            className={mount.mirror ? "btn btn--on" : "btn"}
            aria-pressed={mount.mirror}
            onClick={() => mirrorMount(index)}
          >
            {texts.art.mirror}
          </button>
        </Help>
      </div>
      <Help topic="mountSlide">
        <label className="field">
          {texts.art.slide}
          <select
            className="input"
            value={mount.slide ?? ""}
            onChange={(e) => slideMount(index, e.target.value)}
          >
            {mount.slide === undefined && <option value="" />}
            {slides.map((s) => (
              <option key={s} value={s}>
                {texts.art.slides[s] ?? s}
              </option>
            ))}
          </select>
        </label>
      </Help>
      <Help topic="mountGib">
        <label className="field">
          {texts.art.gib}
          <select
            className="input"
            value={mount.gib}
            onChange={(e) => linkMountGib(index, Number(e.target.value))}
          >
            <option value={0}>{texts.art.gibNone}</option>
            {ship.layoutXml.gibs.map((_, i) => (
              <option key={i} value={i + 1}>
                {texts.art.gibName(i + 1)}
              </option>
            ))}
            {mount.gib > ship.layoutXml.gibs.length && (
              <option value={mount.gib}>{texts.art.gibName(mount.gib)}</option>
            )}
          </select>
        </label>
      </Help>
      <div className="ed-grid2">
        <Help topic="mountPosition">
          <NumberField
            label={texts.art.x}
            value={mount.x}
            onCommit={(x) => placeMount(index, x, mount.y)}
          />
        </Help>
        <Help topic="mountPosition">
          <NumberField
            label={texts.art.y}
            value={mount.y}
            onCommit={(y) => placeMount(index, mount.x, y)}
          />
        </Help>
      </div>
      <div>
        <button type="button" className="btn btn--danger" onClick={() => deleteSelectedArt()}>
          {texts.art.delete}
        </button>
      </div>
    </>
  );
}
