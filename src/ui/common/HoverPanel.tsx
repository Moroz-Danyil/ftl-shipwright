/**
 * A panel of details over the canvas: beside the inspector level with the
 * hovered or focused entry, or below the tool bar. The entry itself never
 * moves.
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
    const left =
      anchor.side === "left"
        ? Math.max(8, anchor.left - width)
        : anchor.side === "below"
          ? Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))
          : anchor.left;
    setPlace({
      left,
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
