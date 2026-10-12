/** The checks button: how many things about the ship to look at, and the list of them. */
import type { ValidationIssue } from "../../core";
import { selectionOfIssue, useChecks } from "../../app/checks";
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { Dialog } from "../common/Dialog";
import { WarningIcon } from "../common/icons";

export function ChecksButton() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present);
  const issues = useChecks(ship);
  const openDialog = useEditor((s) => s.openDialog);
  const count = issues.length;
  return (
    <button
      type="button"
      className={count > 0 ? "btn ed-checks ed-checks--warn" : "btn ed-checks"}
      onClick={() => openDialog("checks")}
    >
      {count > 0 && <WarningIcon />}
      {texts.topBar.checks(count)}
    </button>
  );
}

export function ChecksDialog() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present);
  const issues = useChecks(ship);
  const close = () => useEditor.getState().openDialog(null);

  const show = (issue: ValidationIssue) => {
    const state = useEditor.getState();
    state.setWorkspace("layout");
    state.select(selectionOfIssue(issue));
    close();
  };

  return (
    <Dialog
      title={texts.checks.title}
      onClose={close}
      actions={
        <button type="button" className="btn" onClick={close}>
          {texts.common.close}
        </button>
      }
    >
      {issues.length === 0 ? (
        <span className="muted">{texts.checks.empty}</span>
      ) : (
        <div className="ed-checks-list">
          {issues.map((issue, i) => (
            <button key={i} type="button" className="ed-check" onClick={() => show(issue)}>
              {texts.checks.messages[issue.code](issue)}
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
