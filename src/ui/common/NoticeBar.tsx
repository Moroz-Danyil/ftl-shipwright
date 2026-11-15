/**
 * The latest message for the user: an error, that a save worked, or what is
 * wrong with the ship and what to do (after a click in the Overview).
 */
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
  const issue = notice.kind === "issue" ? (notice.status ?? "check") : undefined;
  return (
    <div
      className={
        notice.kind === "error"
          ? "notice notice--error"
          : issue
            ? `notice notice--issue notice--${issue}`
            : "notice"
      }
      role={notice.kind === "error" ? "alert" : "status"}
    >
      {issue ? (
        <div className="notice-issue">
          <span className="notice-title">
            <span className={`notice-status notice-status--${issue}`}>
              {texts.overview.status[issue]}
            </span>
            {notice.title}
          </span>
          {notice.text && <span>{notice.text}</span>}
          {notice.details && notice.details.length > 0 && (
            <ul className="notice-details">
              {notice.details.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <span>{notice.text}</span>
      )}
      <button type="button" className="btn" onClick={() => setNotice(undefined)}>
        {texts.common.close}
      </button>
    </div>
  );
}
