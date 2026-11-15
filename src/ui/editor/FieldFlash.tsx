/**
 * Marks the field a click in the Overview points at (the element with its
 * `data-field`, else its section's `data-section`) with `data-flashed` and
 * scrolls it into view, while the flash lasts.
 */
import { useEffect } from "react";
import { useEditor } from "../../app/store";

function flashedElement(field: string | undefined, section: string | undefined): Element | null {
  const byField = field ? document.querySelector(`[data-field="${field}"]`) : null;
  if (byField) return byField;
  return section ? document.querySelector(`[data-section="${section}"]`) : null;
}

export function FieldFlash() {
  const flash = useEditor((s) => s.flash);
  useEffect(() => {
    if (!flash) return;
    const element = flashedElement(flash.field, flash.section);
    if (!element) return;
    element.setAttribute("data-flashed", "");
    element.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    return () => element.removeAttribute("data-flashed");
  }, [flash]);
  return null;
}
