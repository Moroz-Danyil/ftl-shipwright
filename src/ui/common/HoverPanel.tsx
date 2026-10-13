/**
 * A panel of details beside the inspector, over the canvas, level with the
 * hovered or focused entry of a list. The list itself never moves.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Anchor } from "./useHoverPanel";

/** A large picture over the details, kept inside the window. */
export function HoverPanel({
  anchor,
  picture,
  children,
}: {
  anchor: Anchor;
  picture: ReactNode;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(anchor.top);
  useLayoutEffect(() => {
    const height = panel.current?.offsetHeight ?? 0;
    setTop(Math.max(8, Math.min(anchor.top, window.innerHeight - height - 8)));
  }, [anchor.top, children]);
  return createPortal(
    <div ref={panel} className="hover-panel" role="tooltip" style={{ left: anchor.left, top }}>
      <span className="hover-panel-pic">{picture}</span>
      {children}
    </div>,
    document.body
  );
}
