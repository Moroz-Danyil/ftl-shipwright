/**
 * A titled part of the inspector that folds away, with a pictogram before
 * its title and an optional count on the right. It remembers between runs
 * whether it was open.
 */
import { useId, useState, type ReactNode } from "react";
import { loadOpenSections, saveSectionOpen } from "../../app/settings";
import { ChevronIcon } from "./icons";
import { Pictogram, type PictogramId } from "./Pictogram";

export function Section({
  id,
  title,
  icon,
  count,
  defaultOpen = true,
  children,
}: {
  /** Names the section in the remembered settings. */
  id: string;
  title: string;
  icon: PictogramId;
  count?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => loadOpenSections()[id] ?? defaultOpen);
  const bodyId = useId();
  const toggle = () => {
    setOpen(!open);
    saveSectionOpen(id, !open);
  };
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
