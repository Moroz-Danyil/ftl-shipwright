/** Save mod: as one `.ftl` file or into a mod folder. */
import { useState } from "react";
import { useChecks } from "../../app/checks";
import { saveShipMod } from "../../app/saveMod";
import { useEditor, type SaveTarget } from "../../app/store";
import { usePlatform } from "../../platform/PlatformContext";
import { useTexts } from "../../text";
import { Dialog } from "../common/Dialog";

export function SaveDialog() {
  const texts = useTexts();
  const platform = usePlatform();
  const doc = useEditor((s) => s.doc);
  const issues = useChecks(doc?.history.present);
  const [busy, setBusy] = useState(false);
  const close = () => useEditor.getState().openDialog(null);
  if (!doc) return null;
  const layout = doc.history.present.blueprint.layout;
  const last = doc.saveTarget;

  const askPath = (kind: SaveTarget["kind"]) =>
    kind === "ftl"
      ? platform.pickSavePath({
          filters: [{ name: texts.save.ftlFilter, extensions: ["ftl"] }],
          defaultPath: last?.kind === "ftl" ? last.path : `${layout}.ftl`,
        })
      : platform.pickFolder({ defaultPath: last?.kind === "folder" ? last.path : undefined });

  const save = async (kind: SaveTarget["kind"]) => {
    const path = await askPath(kind);
    if (!path) return;
    setBusy(true);
    const ok = await saveShipMod(platform, texts, { kind, path });
    setBusy(false);
    if (ok) close();
  };

  return (
    <Dialog
      title={texts.save.title}
      onClose={close}
      actions={
        <button type="button" className="btn" onClick={close}>
          {texts.common.cancel}
        </button>
      }
    >
      {issues.length > 0 && (
        <div className="dlg-warning">{texts.save.checksWarning(issues.length)}</div>
      )}
      <div className="choice-row">
        <button type="button" className="choice" disabled={busy} onClick={() => void save("ftl")}>
          <span className="choice-title">{texts.save.ftl}</span>
          <span className="choice-hint">{texts.save.ftlHint}</span>
        </button>
        <button
          type="button"
          className="choice"
          disabled={busy}
          onClick={() => void save("folder")}
        >
          <span className="choice-title">{texts.save.folder}</span>
          <span className="choice-hint">{texts.save.folderHint}</span>
        </button>
      </div>
      {busy && <span className="muted">{texts.save.saving}</span>}
    </Dialog>
  );
}
