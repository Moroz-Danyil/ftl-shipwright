/**
 * The buttons in the canvas corner: Play explosion with its speed (Hull), the Layers
 * menu and Preview in hangar, which opens the hangar screen over the editor.
 * In Hull the menu notes that the Gib tool shows only the hull and the gibs.
 */
import { useEffect, useRef, useState } from "react";
import { EXPLOSION_SPEEDS } from "../app/art/explosion";
import { LAYERS, useEditor } from "../app/store";
import { useTexts } from "../text";

function LayersMenu({ onClose }: { onClose: () => void }) {
  const texts = useTexts();
  const layers = useEditor((s) => s.view.layers);
  const setLayer = useEditor((s) => s.setLayer);
  const hull = useEditor((s) => s.workspace === "hull");
  return (
    <div className="cv-layers-menu" role="group" aria-label={texts.canvas.layers}>
      {LAYERS.map((layer) => (
        <label key={layer} className="cv-layers-item">
          <input
            type="checkbox"
            checked={layers[layer]}
            onChange={(e) => setLayer(layer, e.target.checked)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          {texts.canvas.layerNames[layer]}
        </label>
      ))}
      {hull && <p className="cv-layers-note">{texts.canvas.gibToolLayers}</p>}
    </div>
  );
}

/** The speed the explosion preview plays at, remembered for the session. */
function SpeedChoice() {
  const texts = useTexts();
  const speed = useEditor((s) => s.explosionSpeed);
  const setSpeed = useEditor((s) => s.setExplosionSpeed);
  return (
    <div className="cv-speed" role="group" aria-label={texts.art.explosionSpeed}>
      {EXPLOSION_SPEEDS.map((option) => (
        <button
          key={option}
          type="button"
          className="cv-speed-option"
          aria-pressed={option === speed}
          aria-label={texts.art.speedNamed(option)}
          title={texts.art.speedNamed(option)}
          onClick={() => setSpeed(option)}
        >
          {texts.art.speed(option)}
        </button>
      ))}
    </div>
  );
}

/** `onPlayExplosion`: shows the Play explosion button and its speed (Hull). */
export function CanvasControls({ onPlayExplosion }: { onPlayExplosion?: () => void }) {
  const texts = useTexts();
  const setPreview = useEditor((s) => s.setHangarPreview);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div className="cv-controls" ref={box} onPointerDown={(e) => e.stopPropagation()}>
      {open && <LayersMenu onClose={() => setOpen(false)} />}
      {onPlayExplosion && (
        <div className="cv-explosion">
          <button
            type="button"
            className="btn btn--small btn--panel"
            title={texts.art.explosionApprox}
            onClick={onPlayExplosion}
          >
            {texts.art.playExplosion}
          </button>
          <SpeedChoice />
        </div>
      )}
      <button
        type="button"
        className="btn btn--small btn--panel"
        aria-expanded={open}
        data-tour="view"
        onClick={() => setOpen(!open)}
      >
        {texts.canvas.layers}
      </button>
      <button
        type="button"
        className="btn btn--small btn--panel"
        aria-haspopup="dialog"
        data-tour="view"
        onClick={() => setPreview(true)}
      >
        {texts.canvas.preview}
      </button>
    </div>
  );
}
