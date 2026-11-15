/**
 * The Info panel's pages for equipment and crew: a weapon or drone slot, an
 * item clicked in the weapon, drone or augment lists, and a crew race. They
 * show the same details as the hover panels, with the picture larger and what
 * the ship has of them.
 */
import type { Ship } from "../../../core";
import type { Selection } from "../../../app/selection";
import { findItem, gameText, itemTitle, type ItemKind } from "../../../app/loadout/catalog";
import { items, slots, type LoadoutKind } from "../../../app/loadout/rules";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { RacePicture } from "../../common/ItemPictures";
import { Details, ItemPicture } from "../ship/ItemList";
import { RaceDetails } from "../ship/RacePicker";
import { Facts, InfoHead, InfoPicture, InfoSection, InfoText } from "./InfoParts";

/** A filled or empty weapon or drone slot of the ship. */
export function SlotInfo({ ship, kind, index }: { ship: Ship; kind: LoadoutKind; index: number }) {
  const texts = useTexts();
  const t = texts.info;
  const data = useEditor((s) => s.game.data);
  const name = items(ship, kind)[index];
  const item = name === undefined ? undefined : findItem(data, kind, name);
  const title = item ? itemTitle(data, item) : name;
  const hasMount = index < ship.layoutXml.mounts.length;
  return (
    <>
      <InfoHead
        kind={kind === "weapon" ? t.kinds.weaponSlot : t.kinds.droneSlot}
        title={texts.loadout.slotLabel(index + 1, title ?? texts.loadout.emptySlot[kind])}
        sub={item ? undefined : name}
        id
      />
      <InfoPicture>{item && <ItemPicture item={item} size={128} />}</InfoPicture>
      <InfoSection title={t.sections.item} icon={kind === "weapon" ? "weapons" : "drones"}>
        {item ? (
          <Details item={item} titled={false} />
        ) : (
          <InfoText muted>{name ? texts.loadout.unknownItem(name) : t.emptySlot}</InfoText>
        )}
      </InfoSection>
      <InfoSection
        title={t.sections.onShip}
        icon={kind === "weapon" ? "weaponSlots" : "droneSlots"}
      >
        <Facts
          rows={[
            [
              kind === "weapon" ? t.weaponSlots : t.droneSlots,
              t.slotOf(index + 1, slots(ship, kind)),
            ],
            [t.mountOf, kind === "weapon" && hasMount ? texts.art.mount(index + 1) : undefined],
          ]}
        />
        {kind === "weapon" && !hasMount && <InfoText muted>{t.noMount}</InfoText>}
      </InfoSection>
    </>
  );
}

/** An item clicked in the weapon, drone or augment lists. */
export function ItemInfo({ ship, kind, name }: { ship: Ship; kind: ItemKind; name: string }) {
  const texts = useTexts();
  const t = texts.info;
  const data = useEditor((s) => s.game.data);
  const item = findItem(data, kind, name);
  if (!item) return null;
  const where =
    kind === "augment" ? [] : items(ship, kind).flatMap((n, i) => (n === name ? [i + 1] : []));
  const augments = ship.blueprint.augments.filter((a) => a === name).length;
  const onShip =
    kind === "augment"
      ? augments > 0
        ? t.augmentCount(augments)
        : t.notEquipped
      : where.length > 0
        ? t.inSlots(where)
        : t.notEquipped;
  return (
    <>
      <InfoHead kind={t.kinds[kind]} title={itemTitle(data, item)} />
      <InfoPicture>
        <ItemPicture item={item} size={128} />
      </InfoPicture>
      <InfoSection
        title={t.sections.item}
        icon={kind === "weapon" ? "weapons" : kind === "drone" ? "drones" : "augments"}
      >
        <Details item={item} titled={false} />
      </InfoSection>
      <InfoSection title={t.sections.onShip} icon="info">
        <InfoText>{onShip}</InfoText>
      </InfoSection>
    </>
  );
}

/** A crew race clicked in the crew or the Add race list. */
export function RaceInfo({ ship, race }: { ship: Ship; race: string }) {
  const texts = useTexts();
  const t = texts.info;
  const data = useEditor((s) => s.game.data);
  const entry = data?.catalogs.races.find((r) => r.name === race);
  if (!entry) return null;
  const amount = ship.blueprint.crew.find((c) => c.race === race)?.amount ?? 0;
  const title = gameText(data, entry.title) || race;
  return (
    <>
      <InfoHead kind={t.kinds.race} title={title} />
      <InfoPicture>
        <RacePicture race={race} size={105} />
      </InfoPicture>
      <InfoSection title={t.sections.item} icon="crew">
        <RaceDetails race={entry} titled={false} />
      </InfoSection>
      <InfoSection title={t.sections.onShip} icon="info">
        <InfoText>{amount > 0 ? t.inCrew(amount) : t.notInCrew}</InfoText>
      </InfoSection>
    </>
  );
}

/** Several things selected: how many of each. */
export function SeveralInfo({ selection }: { selection: Selection }) {
  const texts = useTexts();
  const t = texts.info;
  const kinds = Object.keys(t.severalCount) as Array<keyof typeof t.severalCount>;
  const total = kinds.reduce((n, k) => n + selection[k].length, 0);
  return (
    <>
      <InfoHead kind={t.kinds.several} title={texts.inspector.severalTitle(total)} />
      <InfoSection title={t.sections.item} icon="select">
        <Facts
          rows={kinds.map((k) => [
            t.severalCount[k],
            selection[k].length > 0 ? selection[k].length : undefined,
          ])}
        />
      </InfoSection>
    </>
  );
}
