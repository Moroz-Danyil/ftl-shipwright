/**
 * The ship overview: the top bar button with a badge of how much needs a
 * look, and the dialog with the checklist of the whole ship.
 */
import { useId } from "react";
import {
  overviewCounts,
  useOverview,
  type ItemStatus,
  type OverviewItem,
  type OverviewSection,
} from "../../app/overview";
import { useEditor } from "../../app/store";
import { useTexts } from "../../text";
import { Dialog } from "../common/Dialog";
import { StatusIcon } from "../common/icons";
import { SystemIcon } from "../common/SystemIcon";

export function OverviewButton() {
  const texts = useTexts();
  const { problems, checks } = overviewCounts(useOverview());
  const badge: { status: ItemStatus; count: number } | null =
    problems > 0
      ? { status: "problem", count: problems }
      : checks > 0
        ? { status: "check", count: checks }
        : null;
  return (
    <button
      type="button"
      className="btn btn--tall ed-overview"
      aria-label={texts.overview.buttonLabel(problems, checks)}
      onClick={() => useEditor.getState().openDialog("overview")}
    >
      {texts.overview.button}
      {badge && (
        <span className={`ed-badge ed-badge--${badge.status}`} aria-hidden="true">
          {badge.count}
        </span>
      )}
    </button>
  );
}

function StatusMark({ status }: { status: ItemStatus }) {
  const texts = useTexts();
  return (
    <span
      className={`ov-mark ov-mark--${status}`}
      role="img"
      aria-label={texts.overview.status[status]}
    >
      <StatusIcon ok={status === "ok"} />
    </span>
  );
}

/** An item that is ok: a row with its value. */
function OkRow({ item }: { item: OverviewItem }) {
  return (
    <li className="ov-row">
      <StatusMark status="ok" />
      <span className="ov-title">{item.title}</span>
      {item.value && <span className="ov-value">{item.value}</span>}
    </li>
  );
}

/** An item that needs a look: a card with what is wrong and a link to where to fix it. */
function IssueCard({ item, onGo }: { item: OverviewItem; onGo: (item: OverviewItem) => void }) {
  const texts = useTexts();
  return (
    <li className={`ov-card ov-card--${item.status}`} onClick={() => onGo(item)}>
      <StatusMark status={item.status} />
      <div className="ov-card-body">
        <span className="ov-title">{item.title}</span>
        {item.explanation && <p className="ov-explain">{item.explanation}</p>}
        {item.details.length > 0 && (
          <ul className="ov-details">
            {item.details.map((detail, i) => (
              <li key={i}>
                {detail.systemId && <SystemIcon system={detail.systemId} size={16} />}
                <span>{detail.text}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="link ov-go"
          aria-label={texts.overview.goThereLabel(item.title)}
          onClick={(e) => {
            e.stopPropagation();
            onGo(item);
          }}
        >
          {texts.overview.goThere}
        </button>
      </div>
    </li>
  );
}

function Section({
  section,
  needsOnly,
  onGo,
}: {
  section: OverviewSection;
  needsOnly: boolean;
  onGo: (item: OverviewItem) => void;
}) {
  const headingId = useId();
  const shown = needsOnly ? section.items.filter((i) => i.status !== "ok") : section.items;
  if (shown.length === 0) return null;
  return (
    <section className="ov-section" aria-labelledby={headingId}>
      <h3 id={headingId} className="ov-heading">
        {section.title}
      </h3>
      <ul className="ov-items">
        {shown.map((item) =>
          item.status === "ok" ? (
            <OkRow key={item.id} item={item} />
          ) : (
            <IssueCard key={item.id} item={item} onGo={onGo} />
          )
        )}
      </ul>
    </section>
  );
}

export function OverviewDialog() {
  const texts = useTexts();
  const sections = useOverview();
  const needsOnly = useEditor((s) => s.overviewNeedsOnly);
  const { problems, checks } = overviewCounts(sections);
  const close = () => useEditor.getState().openDialog(null);

  const go = (item: OverviewItem) => {
    const state = useEditor.getState();
    state.setWorkspace(item.workspace);
    state.select(item.selection);
    close();
  };

  return (
    <Dialog
      title={texts.overview.title}
      onClose={close}
      actions={
        <button type="button" className="btn" onClick={close}>
          {texts.common.close}
        </button>
      }
    >
      <p className="ov-intro">{texts.overview.intro}</p>
      <div className="ov-summary">
        {problems + checks === 0 ? (
          <div className="ov-all-good" role="status">
            <StatusIcon ok />
            {texts.overview.allGood}
          </div>
        ) : (
          <div className="ov-chips" role="status">
            {problems > 0 && (
              <span className="ov-chip ov-chip--problem">{texts.overview.problems(problems)}</span>
            )}
            {checks > 0 && (
              <span className="ov-chip ov-chip--check">{texts.overview.toCheck(checks)}</span>
            )}
          </div>
        )}
        <label className="ov-filter">
          <input
            type="checkbox"
            checked={needsOnly}
            onChange={(e) => useEditor.getState().setOverviewNeedsOnly(e.target.checked)}
          />
          {texts.overview.needsOnly}
        </label>
      </div>
      <div className="ov-list">
        {sections.map((section) => (
          <Section key={section.id} section={section} needsOnly={needsOnly} onGo={go} />
        ))}
      </div>
    </Dialog>
  );
}
