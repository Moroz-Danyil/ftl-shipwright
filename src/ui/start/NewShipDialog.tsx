/**
 * Starts a new ship: an empty hull or a copy of a game ship, under a new name
 * (and new file names, so the original is never overwritten).
 */
import { useState } from "react";
import { createNewShip, newShipIds } from "../../app/ships";
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { Dialog } from "../common/Dialog";
import { ShipPicker } from "./ShipPicker";

export function NewShipDialog() {
  const texts = useTexts();
  const ships = useEditor((s) => s.game.data?.catalogs.ships ?? []);
  const close = () => useEditor.getState().openDialog(null);
  const [copy, setCopy] = useState(false);
  const [source, setSource] = useState<string>();
  const [name, setName] = useState(texts.newShip.defaultName);
  const [nameEdited, setNameEdited] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = (shipName: string) => {
    setSource(shipName);
    if (!nameEdited) {
      const entry = ships.find((s) => s.name === shipName);
      setName(texts.newShip.copyName(entry?.displayName ?? shipName));
    }
  };

  const trimmed = name.trim();
  const ready = trimmed !== "" && (!copy || source !== undefined) && !busy;
  const create = async () => {
    if (!ready) return;
    setBusy(true);
    const ok = await createNewShip(texts, { name: trimmed, copyOf: copy ? source : undefined });
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
        <button type="button" className="choice" aria-pressed={copy} onClick={() => setCopy(true)}>
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
      <span className="eyebrow mono">
        {texts.newShip.savedAs(newShipIds(trimmed || texts.newShip.defaultName, ships).name)}
      </span>
    </Dialog>
  );
}
