/**
 * The pieces every page of the Info panel is built from: the heading with the
 * subject's kind and name, a large picture on the dark icon chip, titled
 * sections in the inspector's style and rows of values like the stats.
 */
import type { ReactNode } from "react";
import { Pictogram, type PictogramId } from "../../common/Pictogram";

/** `sub`: a line under the name; `id` when it is a name from the game's files (set in mono). */
export function InfoHead({
  kind,
  title,
  sub,
  id = false,
}: {
  kind: string;
  title: string;
  sub?: string;
  id?: boolean;
}) {
  return (
    <div className="ed-heading info-head">
      <span className="eyebrow">{kind}</span>
      <span className="ed-heading-title">{title}</span>
      {sub && <span className={id ? "muted mono info-sub" : "muted info-sub"}>{sub}</span>}
    </div>
  );
}

/** The subject's picture, large, on the dark chip the system icons sit on. */
export function InfoPicture({ children }: { children: ReactNode }) {
  return (
    <div className="info-pic" data-testid="info-picture">
      {children}
    </div>
  );
}

export function InfoSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: PictogramId;
  children: ReactNode;
}) {
  return (
    <section className="info-sec" aria-label={title}>
      <h3 className="info-sec-title">
        <Pictogram id={icon} size={20} />
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Numbers, a range ("0 to 1") or a count ("1 of 4"), with or without a unit,
 * are set in mono like the stats; words are not.
 */
const NUMERIC = /^[-+\d.,\s×°/:]+((to|of)[-+\d.,\s×°/:]+)?(px|s|%|scrap|cells)?$/;

/** Label and value rows, read like a table of contents; rows without a value are left out. */
export function Facts({ rows }: { rows: Array<[string, ReactNode | undefined]> }) {
  const shown = rows.filter(
    (r): r is [string, ReactNode] => r[1] !== undefined && r[1] !== null && r[1] !== ""
  );
  if (shown.length === 0) return null;
  return (
    <dl className="lo-stats">
      {shown.map(([label, value]) => (
        <div key={label} className="ed-row">
          <dt>{label}</dt>
          <dd
            className={
              typeof value === "number" || (typeof value === "string" && NUMERIC.test(value))
                ? "mono"
                : undefined
            }
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function InfoText({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <p className={muted ? "info-text muted" : "info-text"}>{children}</p>;
}
