/**
 * The Loadout inspector: the selected slot, the counts (slots, missiles,
 * drone parts), the ship's augments, and the game's items to add.
 */
import { useState } from "react";
import type { Ship } from "../../../core";
import {
  moveSlot,
  removeSelectedSlots,
  removeShipAugment,
  setSlotCount,
  setStartingDroneParts,
  setStartingMissiles,
} from "../../../app/loadoutActions";
import { findItem, itemTitle, type ItemKind } from "../../../app/loadout/catalog";
import { LIMITS, items, slots, type LoadoutKind } from "../../../app/loadout/rules";
import { singleTarget } from "../../../app/selection";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { NumberField } from "../../common/NumberField";
import { Section } from "../../common/Section";
import { Stepper } from "../../common/Stepper";
import { ItemCards } from "./ItemCards";

const TABS: ItemKind[] = ["weapon", "drone", "augment"];

function SelectedSlot({ ship, kind, index }: { ship: Ship; kind: LoadoutKind; index: number }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const list = items(ship, kind);
  const name = list[index];
  if (name === undefined) return null;
  const item = findItem(data, kind, name);
  return (
    <div className="ed-group">
      <span className="eyebrow">
        {kind === "weapon"
          ? texts.loadout.selectedWeapon(index + 1)
          : texts.loadout.selectedDrone(index + 1)}
      </span>
      <span className="sy-card-title">
        {item ? itemTitle(data, item) : texts.loadout.unknownItem(name)}
      </span>
      {kind === "weapon" && <span className="muted">{texts.loadout.drawnOnMount(index + 1)}</span>}
      <div className="ed-row">
        <button
          type="button"
          className="btn"
          disabled={index === 0}
          onClick={() => moveSlot(kind, index, -1)}
        >
          {texts.loadout.earlier}
        </button>
        <button
          type="button"
          className="btn"
          disabled={index === list.length - 1}
          onClick={() => moveSlot(kind, index, 1)}
        >
          {texts.loadout.later}
        </button>
        <button type="button" className="btn btn--danger" onClick={() => removeSelectedSlots()}>
          {texts.loadout.remove}
        </button>
      </div>
    </div>
  );
}

function Counts({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const bp = ship.blueprint;
  return (
    <Section id="loadout-slots" title={texts.sections.slots}>
      <Stepper
        label={texts.loadout.weaponSlots}
        value={slots(ship, "weapon")}
        min={items(ship, "weapon").length}
        max={LIMITS.weaponSlots}
        onChange={(n) => setSlotCount("weapon", n)}
      />
      <Stepper
        label={texts.loadout.droneSlots}
        value={slots(ship, "drone")}
        min={items(ship, "drone").length}
        max={LIMITS.droneSlots}
        onChange={(n) => setSlotCount("drone", n)}
      />
      <div className="ed-grid2">
        <NumberField
          label={texts.loadout.missiles}
          value={bp.weaponList?.missiles ?? 0}
          onCommit={setStartingMissiles}
        />
        <NumberField
          label={texts.loadout.droneParts}
          value={bp.droneList?.drones ?? 0}
          onCommit={setStartingDroneParts}
        />
      </div>
    </Section>
  );
}

function Augments({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const data = useEditor((s) => s.game.data);
  const augments = ship.blueprint.augments;
  return (
    <Section
      id="loadout-augments"
      title={texts.sections.augments}
      count={texts.sections.count(augments.length, 3)}
    >
      <div className="ed-stack" role="group" aria-label={texts.loadout.augments(augments.length)}>
        {augments.length === 0 && <span className="muted">{texts.loadout.noAugments}</span>}
        {augments.map((name, i) => {
          const item = findItem(data, "augment", name);
          const title = item ? itemTitle(data, item) : name;
          return (
            <div key={i} className="ed-row">
              <span>{title}</span>
              <button
                type="button"
                className="btn btn--small btn--danger"
                aria-label={texts.loadout.removeNamed(title)}
                onClick={() => removeShipAugment(i)}
              >
                {texts.loadout.remove}
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function LoadoutInspector() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const selection = useEditor((s) => s.selection);
  const [tab, setTab] = useState<ItemKind>("weapon");
  if (!ship) return null;
  const target = singleTarget(selection);
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.loadout.eyebrow}</span>
        <span className="ed-heading-title">{texts.inspector.loadout.title}</span>
      </div>
      {(target?.kind === "weapon" || target?.kind === "drone") && (
        <SelectedSlot ship={ship} kind={target.kind} index={target.index} />
      )}
      <Counts ship={ship} />
      <Augments ship={ship} />
      <Section id="loadout-add" title={texts.sections.addItems}>
        <div className="lo-tabs" role="tablist" aria-label={texts.loadout.tabsLabel}>
          {TABS.map((kind) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={tab === kind}
              className="lo-tab"
              onClick={() => setTab(kind)}
            >
              {texts.loadout.tabs[kind]}
            </button>
          ))}
        </div>
        <ItemCards key={tab} kind={tab} />
      </Section>
    </>
  );
}
