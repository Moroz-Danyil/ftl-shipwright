/**
 * The yes/no question asked through `askConfirm`: a title, the message,
 * Cancel and a confirm button named by its verb. Esc, Cancel and a click
 * outside answer no. A question that loses something has a red confirm button
 * and starts with the focus on Cancel; otherwise the focus starts on the
 * confirm button. Enter presses the focused button.
 */
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { Dialog } from "./Dialog";

export function ConfirmDialog() {
  const texts = useTexts();
  const confirmation = useEditor((s) => s.confirmation);
  const answer = useEditor((s) => s.answerConfirm);
  if (!confirmation) return null;
  const { title, message, confirm, danger = false } = confirmation;
  return (
    <Dialog
      title={title}
      onClose={() => answer(false)}
      size="small"
      actions={
        <>
          <button type="button" className="btn" onClick={() => answer(false)}>
            {texts.common.cancel}
          </button>
          <button
            type="button"
            className={danger ? "btn btn--destructive" : "btn btn--primary"}
            data-autofocus={danger ? undefined : true}
            onClick={() => answer(true)}
          >
            {confirm}
          </button>
        </>
      }
    >
      <p className="dlg-message">{message}</p>
    </Dialog>
  );
}
