/**
 * Preview in hangar: a full-window view of the game's hangar screen
 * (1280 × 720, scaled to fit, crisp where the size allows) with the ship
 * where the game puts it and its name, built from the game's own pictures. It only shows;
 * Esc or the close button leaves it.
 */
import { useEffect, useRef } from "react";
import { useEditor } from "../../app/store";
import { shipDisplayName } from "../../app/ships";
import { useTexts } from "../../text";
import { BackIcon } from "../../ui/common/icons";
import { useElementSize } from "../useElementSize";
import { HANGAR_BOXES, HANGAR_PICTURES, SCREEN, hangarScale } from "./hangarLayout";
import { HangarShip } from "./HangarShip";
import { ScreenPicture } from "./ScreenPicture";
import { useGameText } from "./useGameText";

function ShipNameBox() {
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const data = useEditor((s) => s.game.data);
  const label = useGameText("ship_rename_button");
  const { x, y } = HANGAR_BOXES.shipName;
  return (
    <g data-testid="hangar-name">
      <ScreenPicture path={HANGAR_PICTURES.shipName} x={x} y={y} />
      <text className="hg-text hg-text--label" x={x + 54} y={y + 24}>
        {label}
      </text>
      <text className="hg-text hg-text--name" x={x + 273} y={y + 24}>
        {ship ? shipDisplayName(ship, data) : ""}
      </text>
    </g>
  );
}

export function HangarPreview() {
  const texts = useTexts();
  const setPreview = useEditor((s) => s.setHangarPreview);
  const box = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const size = useElementSize(box);
  const scale = size ? hangarScale(size.width, size.height, window.devicePixelRatio || 1) : 1;

  useEffect(() => {
    close.current?.focus();
    // Esc leaves the preview before the editor's own keys see it.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPreview(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [setPreview]);

  return (
    <div
      ref={box}
      className="hg-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={texts.canvas.preview}
      data-testid="hangar-preview"
    >
      <svg
        className="hg-screen"
        data-testid="hangar-svg"
        width={SCREEN.width * scale}
        height={SCREEN.height * scale}
        viewBox={`0 0 ${SCREEN.width} ${SCREEN.height}`}
      >
        <ScreenPicture path={HANGAR_PICTURES.background} x={0} y={0} />
        <HangarShip />
        <ShipNameBox />
      </svg>
      <button
        ref={close}
        type="button"
        className="hg-close"
        data-testid="hangar-close"
        aria-keyshortcuts="Escape"
        onClick={() => setPreview(false)}
      >
        <BackIcon />
        <span className="hg-close-label">{texts.canvas.previewOff}</span>
        <kbd className="hg-close-key" aria-hidden="true">
          {texts.canvas.previewOffKey}
        </kbd>
      </button>
    </div>
  );
}
