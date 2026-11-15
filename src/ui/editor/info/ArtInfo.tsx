/**
 * The Info panel's pages for the hull: a weapon mount (the weapon drawn on it
 * with its details, its number, turning, how it slides out, its gib) and an
 * explosion piece (its picture, position and motion).
 */
import type { Ship } from "../../../core";
import { pictureName } from "../../../app/art/model";
import { findItem, itemTitle } from "../../../app/loadout/catalog";
import { slots } from "../../../app/loadout/rules";
import { useEditor } from "../../../app/store";
import { usePictureRef } from "../../../canvas/pictures";
import { useTexts } from "../../../text";
import { WeaponPicture } from "../../common/ItemPictures";
import { Details } from "../ship/ItemList";
import { Facts, InfoHead, InfoPicture, InfoSection, InfoText } from "./InfoParts";

export function MountInfo({ ship, index }: { ship: Ship; index: number }) {
  const texts = useTexts();
  const t = texts.info;
  const data = useEditor((s) => s.game.data);
  const mount = ship.layoutXml.mounts[index];
  if (!mount) return null;
  const weapon = ship.blueprint.weaponList?.items[index];
  const item = weapon === undefined ? undefined : findItem(data, "weapon", weapon);
  const yesNo = (on: boolean) => (on ? t.yes : t.no);
  const gibs = ship.layoutXml.gibs.length;
  const weaponSlots = slots(ship, "weapon");
  return (
    <>
      <InfoHead
        kind={t.kinds.mount}
        title={texts.art.mount(index + 1)}
        sub={item ? itemTitle(data, item) : weapon}
      />
      <InfoPicture>
        {weapon ? (
          <WeaponPicture name={weapon} size={128} />
        ) : (
          <span className="info-empty-mount" aria-hidden="true" />
        )}
      </InfoPicture>
      <InfoSection title={t.sections.weapon} icon="weapons">
        {item ? (
          <Details item={item} titled={false} />
        ) : weapon ? (
          <InfoText muted>{texts.loadout.unknownItem(weapon)}</InfoText>
        ) : (
          <InfoText muted>{texts.art.noWeapon}</InfoText>
        )}
      </InfoSection>
      <InfoSection title={t.sections.mount} icon="mounts">
        <Facts
          rows={[
            [t.weaponSlot, index < weaponSlots ? t.slotOf(index + 1, weaponSlots) : t.noMountSlot],
            [t.rotate, yesNo(mount.rotate)],
            [t.mirror, yesNo(mount.mirror)],
            [
              t.slide,
              mount.slide === undefined
                ? undefined
                : (texts.art.slides[mount.slide] ?? mount.slide),
            ],
            [
              t.gib,
              mount.gib >= 1 && mount.gib <= gibs
                ? texts.art.gibName(mount.gib)
                : texts.art.gibNone,
            ],
            [t.position, t.pixels(mount.x, mount.y)],
          ]}
        />
      </InfoSection>
    </>
  );
}

export function GibInfo({ ship, index }: { ship: Ship; index: number }) {
  const texts = useTexts();
  const t = texts.info;
  const source = useEditor((s) => s.doc?.history.present.art.source);
  const picture = useEditor((s) => s.doc?.history.present.art.gibs[index]);
  const loaded = usePictureRef(source, picture ?? undefined);
  const gib = ship.layoutXml.gibs[index];
  if (!gib) return null;
  const mounts = ship.layoutXml.mounts.flatMap((m, i) => (m.gib === index + 1 ? [i + 1] : []));
  return (
    <>
      <InfoHead
        kind={t.kinds.gib}
        title={texts.art.gibName(index + 1)}
        sub={picture ? pictureName(picture) : texts.art.noPicture}
        id={!!picture}
      />
      <InfoPicture>
        {loaded && <img className="info-pic-img" src={loaded.url} alt="" />}
      </InfoPicture>
      <InfoSection title={t.sections.motion} icon="gibs">
        <Facts
          rows={[
            [t.position, t.pixels(gib.x, gib.y)],
            [t.velocity, t.range(gib.velocity.min, gib.velocity.max)],
            [t.direction, t.degrees(gib.direction.min, gib.direction.max)],
            [t.turning, t.range(gib.angular.min, gib.angular.max)],
            [
              t.picture,
              loaded ? texts.art.pictureSize(loaded.width, loaded.height) : texts.art.noPicture,
            ],
            [
              t.mountsOnGib,
              mounts.length > 0 ? mounts.map((n) => texts.art.mount(n)).join(", ") : t.noMounts,
            ],
          ]}
        />
      </InfoSection>
    </>
  );
}
