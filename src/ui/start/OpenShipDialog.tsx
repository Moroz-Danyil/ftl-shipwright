/** Picks a ship of the game (or the mod) and opens it for editing in place. */
import { useState } from "react";
import { openGameShip } from "../../app/ships";
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { Dialog } from "../common/Dialog";
import { ShipPicker } from "./ShipPicker";

export function OpenShipDialog() {
  const texts = useTexts();
  const ships = useEditor((s) => s.game.data?.catalogs.ships ?? []);
  const close = () => useEditor.getState().openDialog(null);
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);

  const open = async (name: string | undefined) => {
    if (!name || busy) return;
    setBusy(true);
    const ok = await openGameShip(texts, name);
    setBusy(false);
    if (!ok) close();
  };

  return (
    <Dialog
      title={texts.openShip.title}
      onClose={close}
      actions={
        <>
          <button type="button" className="btn" onClick={close}>
            {texts.common.cancel}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!selected || busy}
            onClick={() => void open(selected)}
          >
            {texts.openShip.open}
          </button>
        </>
      }
    >
      <ShipPicker
        ships={ships}
        selected={selected}
        onSelect={setSelected}
        onChoose={(name) => void open(name)}
      />
    </Dialog>
  );
}
