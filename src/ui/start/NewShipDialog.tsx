/**
 * Starts a new ship: an empty hull or a copy of a game ship, under a new name
 * (and new file names, so the original is never overwritten), in a slot of
 * the game's hangar or under an own blueprint name.
 */
import { useState } from "react";
import { isValidId } from "../../app/details/rules";
import { DEFAULT_SLOT, slotName, slotOf, type HangarSlot } from "../../app/hangar";
import { createNewShip, newShipIds } from "../../app/ships";
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { Dialog } from "../common/Dialog";
import { HangarSlotPicker } from "../common/HangarSlotPicker";
import { ShipPicker } from "./ShipPicker";

export function NewShipDialog() {
  const texts = useTexts();
  const ships = useEditor((s) => s.game.data?.catalogs.ships ?? []);
  const close = () => useEditor.getState().openDialog(null);
  const [copy, setCopy] = useState(false);
  const [source, setSource] = useState<string>();
  const [name, setName] = useState(texts.newShip.defaultName);
  const [nameEdited, setNameEdited] = useState(false);
  const [slot, setSlot] = useState<HangarSlot>(DEFAULT_SLOT);
  const [slotEdited, setSlotEdited] = useState(false);
  const [own, setOwn] = useState(false);
  const [ownName, setOwnName] = useState<string>();
  const [busy, setBusy] = useState(false);

  const pick = (shipName: string) => {
    setSource(shipName);
    if (!nameEdited) {
      const entry = ships.find((s) => s.name === shipName);
      setName(texts.newShip.copyName(entry?.displayName ?? shipName));
    }
    // A copy of a hangar ship takes that ship's slot unless another was chosen.
    const sourceSlot = slotOf(shipName);
    if (!slotEdited && sourceSlot) setSlot(sourceSlot);
  };
  const pickSlot = (next: HangarSlot) => {
    setSlot(next);
    setSlotEdited(true);
  };

  const trimmed = name.trim();
  const ids = newShipIds(trimmed || texts.newShip.defaultName, ships);
  const ownValue = ownName ?? ids.name;
  const ownValid = isValidId(ownValue);
  const blueprint = own ? ownValue : slotName(slot);
  const ready = trimmed !== "" && (!copy || source !== undefined) && (!own || ownValid) && !busy;
  const create = async () => {
    if (!ready) return;
    setBusy(true);
    const ok = await createNewShip(texts, {
      name: trimmed,
      copyOf: copy ? source : undefined,
      blueprint,
    });
    setBusy(false);
    if (!ok) close();
  };

  return (
    <Dialog
      title={texts.newShip.title}
      onClose={close}
      actions={
        <>
          <button type="button" className="btn" onClick={close}>
            {texts.common.cancel}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!ready}
            onClick={() => void create()}
          >
            {texts.newShip.create}
          </button>
        </>
      }
    >
      <div className="ns-body">
        <div className="choice-row">
          <button
            type="button"
            className="choice"
            aria-pressed={!copy}
            onClick={() => setCopy(false)}
          >
            <span className="choice-title">{texts.newShip.empty}</span>
            <span className="choice-hint">{texts.newShip.emptyHint}</span>
          </button>
          <button
            type="button"
            className="choice"
            aria-pressed={copy}
            onClick={() => setCopy(true)}
          >
            <span className="choice-title">{texts.newShip.copy}</span>
            <span className="choice-hint">{texts.newShip.copyHint}</span>
          </button>
        </div>
        {copy && <ShipPicker ships={ships} selected={source} onSelect={pick} onChoose={pick} />}
        <label className="field">
          {texts.newShip.name}
          <input
            className="input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameEdited(true);
            }}
            onKeyDown={(e) => e.key === "Enter" && void create()}
          />
        </label>
        <fieldset className="field ns-slot">
          <legend className="ns-legend">{texts.hangarSlot.label}</legend>
          <HangarSlotPicker slot={own ? undefined : slot} onPick={pickSlot} disabled={own} />
          {!own && <span className="hs-note">{texts.newShip.slotHint}</span>}
          <label className="ed-choice">
            <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} />
            {texts.newShip.ownName}
          </label>
          {own && (
            <>
              <input
                className="input mono"
                aria-label={texts.newShip.ownName}
                value={ownValue}
                onChange={(e) => setOwnName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void create()}
              />
              <span className="hs-note">
                {ownValid ? texts.newShip.ownNameHint : texts.hangar.invalidId}
              </span>
            </>
          )}
        </fieldset>
      </div>
      <span className="eyebrow mono">{texts.newShip.savedAs(blueprint, ids.layout)}</span>
    </Dialog>
  );
}
