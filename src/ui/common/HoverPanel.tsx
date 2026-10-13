/**
 * A panel of details beside the inspector (or left of the tool rail), over
 * the canvas, level with the hovered or focused entry. The entry itself
 * never moves.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Anchor } from "./useHoverPanel";

/** The details, under a large picture when there is one, kept inside the window. */
export function HoverPanel({
  anchor,
  picture,
  children,
}: {
  anchor: Anchor;
  picture?: ReactNode;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ left: anchor.left, top: anchor.top });
  useLayoutEffect(() => {
    const height = panel.current?.offsetHeight ?? 0;
    const width = panel.current?.offsetWidth ?? 0;
    setPlace({
      left: anchor.side === "left" ? Math.max(8, anchor.left - width) : anchor.left,
      top: Math.max(8, Math.min(anchor.top, window.innerHeight - height - 8)),
    });
  }, [anchor.left, anchor.top, anchor.side, children]);
  return createPortal(
    <div ref={panel} className="hover-panel" role="tooltip" style={place}>
      {picture && <span className="hover-panel-pic">{picture}</span>}
      {children}
    </div>,
    document.body
  );
}
