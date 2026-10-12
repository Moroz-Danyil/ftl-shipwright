/** The latest message for the user (an error, or that a save worked). */
import { useEffect } from "react";
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";

/** How long a message that is not an error stays. */
const INFO_MS = 6000;

export function NoticeBar() {
  const texts = useTexts();
  const notice = useEditor((s) => s.notice);
  const setNotice = useEditor((s) => s.setNotice);

  useEffect(() => {
    if (notice?.kind !== "info") return;
    const timer = setTimeout(() => {
      if (useEditor.getState().notice === notice) setNotice(undefined);
    }, INFO_MS);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);

  if (!notice) return null;
  return (
    <div
      className={notice.kind === "error" ? "notice notice--error" : "notice"}
      role={notice.kind === "error" ? "alert" : "status"}
    >
      <span>{notice.text}</span>
      <button type="button" className="btn" onClick={() => setNotice(undefined)}>
        {texts.common.close}
      </button>
    </div>
  );
}
