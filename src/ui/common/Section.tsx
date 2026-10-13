/**
 * A titled part of the inspector that folds away, with an optional count on
 * the right. It remembers between runs whether it was open.
 */
import { useId, useState, type ReactNode } from "react";
import { loadOpenSections, saveSectionOpen } from "../../app/settings";
import { ChevronIcon } from "./icons";

export function Section({
  id,
  title,
  count,
  defaultOpen = true,
  children,
}: {
  /** Names the section in the remembered settings. */
  id: string;
  title: string;
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
