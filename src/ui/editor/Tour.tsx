/**
 * The guided tour over the editor: the window dimmed except the part a step
 * is about (outlined in amber, following it as the window changes), and a
 * card next to it with the step's title, its explanation and the buttons.
 * → or Enter goes on, ← back, Esc ends the tour. A step whose part is not on
 * screen switches to the workspace that shows it; a step that still finds
 * nothing shows its card in the middle of the window.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "../../app/store";
import { TOUR_STEPS, placeCard, tourKeys, type Box, type Size } from "../../app/tour";
import { useTexts } from "../../text";

/** Room left around the highlighted part, inside its outline. */
const OUTLINE_PADDING = 4;

/** The box around every element shown with this `data-tour` value, or null when none is. */
function findTarget(target: string): Box | null {
  let box: { left: number; top: number; right: number; bottom: number } | null = null;
  for (const element of document.querySelectorAll(`[data-tour="${target}"]`)) {
    const r = element.getBoundingClientRect();
    if (r.width <= 0 && r.height <= 0) continue;
    box = box
      ? {
          left: Math.min(box.left, r.left),
          top: Math.min(box.top, r.top),
          right: Math.max(box.right, r.right),
          bottom: Math.max(box.bottom, r.bottom),
        }
      : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }
  if (!box) return null;
  const area = { width: window.innerWidth, height: window.innerHeight };
  // The outline stays inside the window, so it shows also around parts at its edges.
  const left = Math.max(1, box.left - OUTLINE_PADDING);
  const top = Math.max(1, box.top - OUTLINE_PADDING);
  const right = Math.min(area.width - 1, box.right + OUTLINE_PADDING);
  const bottom = Math.min(area.height - 1, box.bottom + OUTLINE_PADDING);
  return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

interface Layout {
  target: Box | null;
  card: Size;
  area: Size;
}

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);

const sameLayout = (a: Layout, b: Layout) =>
  sameBox(a.target, b.target) &&
  a.card.width === b.card.width &&
  a.card.height === b.card.height &&
  a.area.width === b.area.width &&
  a.area.height === b.area.height;

export function Tour() {
  const texts = useTexts();
  const tour = useEditor((s) => s.tour);
  const workspace = useEditor((s) => s.workspace);
  const keys = useEditor((s) => s.keys);
  const titleId = useId();
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  const index = tour ? Math.min(Math.max(tour.step, 0), TOUR_STEPS.length - 1) : 0;
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;
  const tourKeysNow = useMemo(() => tourKeys(keys), [keys]);
  const running = tour !== null;

  // A step whose part is not on screen opens the workspace that shows it.
  useLayoutEffect(() => {
    if (!running) return;
    if (!findTarget(step.target) && step.workspace && step.workspace !== workspace)
      useEditor.getState().setWorkspace(step.workspace);
  }, [running, step, workspace]);

  // Follows the part and the card on every frame: they move with resizing,
  // scrolling, the scale and the workspace's content.
  useLayoutEffect(() => {
    if (!running) return;
    let frame = 0;
    const measure = () => {
      const size = card.current?.getBoundingClientRect();
      const next: Layout = {
        target: findTarget(step.target),
        card: { width: size?.width ?? 0, height: size?.height ?? 0 },
        area: { width: window.innerWidth, height: window.innerHeight },
      };
      setLayout((now) => (now && sameLayout(now, next) ? now : next));
    };
    const loop = () => {
      measure();
      frame = requestAnimationFrame(loop);
    };
    measure();
    if (typeof requestAnimationFrame === "function") frame = requestAnimationFrame(loop);
    window.addEventListener("resize", measure);
    return () => {
      if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [running, step, workspace]);

  // The focus goes to the card and stays there, also when Back is turned off on the first step.
  useEffect(() => {
    if (!running) return;
    const active = document.activeElement;
    const lost = active instanceof HTMLButtonElement && active.disabled;
    if (lost || !card.current?.contains(active)) next.current?.focus();
  }, [running, index]);

  // The tour's keys, before anything else in the window sees them.
  useEffect(() => {
    if (!running) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const { setTourStep, endTour } = useEditor.getState();
      const onButton =
        event.target instanceof HTMLButtonElement && !!card.current?.contains(event.target);
      if (event.key === "ArrowRight" || (event.key === "Enter" && !onButton)) {
        if (last) endTour();
        else setTourStep(index + 1);
      } else if (event.key === "ArrowLeft") {
        if (index > 0) setTourStep(index - 1);
      } else if (event.key === "Escape") {
        endTour();
      } else if (event.key === "Enter" || event.key === " " || event.key === "Tab") {
        // Pressing or moving between the card's own buttons.
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [running, index, last]);

  if (!tour) return null;
  const { setTourStep, endTour } = useEditor.getState();
  const stepTexts = texts.tour.steps[step.id];
  const target = layout?.target ?? null;
  const position = layout ? placeCard(target, layout.card, layout.area) : null;

  return (
    <div
      className={target ? "tour" : "tour tour--dim"}
      data-step={step.id}
      // Nothing under the tour reacts to the pointer while it runs; the focus stays on the card.
      onPointerDown={(e) => {
        if (!card.current?.contains(e.target as Node)) e.preventDefault();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {target && (
        <div
          className="tour-hole"
          data-testid="tour-highlight"
          style={{ left: target.x, top: target.y, width: target.width, height: target.height }}
        />
      )}
      <div
        ref={card}
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={position ? { left: position.x, top: position.y } : { left: 0, top: 0, opacity: 0 }}
      >
        <span className="eyebrow">{texts.tour.stepOf(index + 1, TOUR_STEPS.length)}</span>
        <h2 id={titleId} className="tour-title">
          {stepTexts.title}
        </h2>
        <p className="tour-body">{stepTexts.body(tourKeysNow)}</p>
        <p className="tour-keys">{texts.tour.keysHint}</p>
        <div className="tour-actions">
          <button type="button" className="btn btn--small tour-skip" onClick={endTour}>
            {texts.tour.skip}
          </button>
          <button
            type="button"
            className="btn btn--small"
            disabled={index === 0}
            onClick={() => setTourStep(index - 1)}
          >
            {texts.tour.back}
          </button>
          <button
            ref={next}
            type="button"
            className="btn btn--small btn--primary"
            onClick={() => (last ? endTour() : setTourStep(index + 1))}
          >
            {last ? texts.tour.done : texts.tour.next}
          </button>
        </div>
      </div>
    </div>
  );
}
