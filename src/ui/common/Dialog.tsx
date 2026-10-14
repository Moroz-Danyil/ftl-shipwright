/**
 * A modal dialog: a title, content and actions. Esc and a click outside close
 * it. The focus starts on the element marked `data-autofocus`, or else on the
 * first field or button.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  /** A small dialog for a short question. */
  size?: "small";
}

export function Dialog({ title, onClose, children, actions, size }: Props) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first =
      panel.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel.current?.querySelector<HTMLElement>(
        'input, select, textarea, button:not(:disabled):not([tabindex="-1"])'
      );
    first?.focus();
  }, []);

  return (
    <div
      className="dlg-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className={size === "small" ? "dlg dlg--small" : "dlg"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <h2 id={titleId} className="dlg-title">
          {title}
        </h2>
        <div className="dlg-body">{children}</div>
        {actions && <div className="dlg-actions">{actions}</div>}
      </div>
    </div>
  );
}
