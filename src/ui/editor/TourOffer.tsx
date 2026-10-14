/**
 * The offer of a tour on the first ship opened in a run of the app: Start the
 * tour, Skip (offered again next run; also Esc and a click outside) or Don't
 * offer this again.
 */
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { Dialog } from "../common/Dialog";

export function TourOffer() {
  const texts = useTexts();
  const answer = useEditor((s) => s.answerTourOffer);
  return (
    <Dialog
      title={texts.tour.offer.title}
      onClose={() => answer("skip")}
      size="small"
      actions={
        <>
          <button type="button" className="btn tour-never" onClick={() => answer("never")}>
            {texts.tour.offer.never}
          </button>
          <button type="button" className="btn" onClick={() => answer("skip")}>
            {texts.tour.offer.skip}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            data-autofocus
            onClick={() => answer("start")}
          >
            {texts.tour.offer.start}
          </button>
        </>
      }
    >
      <p className="dlg-message">{texts.tour.offer.message}</p>
    </Dialog>
  );
}
