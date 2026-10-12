import { useEffect, useState, type RefObject } from "react";

export interface Size {
  width: number;
  height: number;
}

/** The element's size, kept up to date while it changes. */
export function useElementSize(ref: RefObject<HTMLElement | null>): Size | undefined {
  const [size, setSize] = useState<Size>();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setSize((old) =>
        old && old.width === rect.width && old.height === rect.height
          ? old
          : { width: rect.width, height: rect.height }
      );
    };
    const frame = requestAnimationFrame(measure);
    if (typeof ResizeObserver === "undefined") return () => cancelAnimationFrame(frame);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref]);
  return size;
}
