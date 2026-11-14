/**
 * A titled part of the inspector that folds away, with a pictogram before
 * its title and an optional count on the right. Sections start folded each
 * time the app starts; one opened stays open for the rest of the run.
 */
import { useId, type ReactNode } from "react";
import { useEditor } from "../../app/store";
import { ChevronIcon } from "./icons";
import { Pictogram, type PictogramId } from "./Pictogram";

export function Section({
  id,
  title,
  icon,
  count,
  defaultOpen = false,
  children,
}: {
  /** Names the section, so it stays open or folded for the rest of the run. */
  id: string;
  title: string;
  icon: PictogramId;
  count?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const open = useEditor((s) => s.openSections[id] ?? defaultOpen);
  const setSectionOpen = useEditor((s) => s.setSectionOpen);
  const bodyId = useId();
  const toggle = () => setSectionOpen(id, !open);
  return (
    <section className="sec" aria-label={title}>
      <button
        type="button"
        className="sec-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={toggle}
      >
        <span className="sec-chevron">
          <ChevronIcon />
        </span>
        <Pictogram id={icon} />
        <span className="sec-title">{title}</span>
        {count !== undefined && <span className="sec-count">{count}</span>}
      </button>
      {open && (
        <div id={bodyId} className="sec-body">
          {children}
        </div>
      )}
    </section>
  );
}

/** A titled group inside a section, such as the save name under the ship's info. */
export function SubHeading({
  title,
  icon,
  children,
}: {
  title: string;
  icon: PictogramId;
  children: ReactNode;
}) {
  return (
    <div className="sec-sub" role="group" aria-label={title}>
      <span className="sec-sub-title">
        <Pictogram id={icon} size={20} />
        {title}
      </span>
      {children}
    </div>
  );
}
