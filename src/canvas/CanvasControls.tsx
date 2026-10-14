/**
 * The buttons in the canvas corner: Play explosion (Hull), the Layers
 * menu and Preview in hangar, which opens the hangar screen over the editor.
 */
import { useEffect, useRef, useState } from "react";
import { LAYERS, useEditor } from "../app/store";
import { useTexts } from "../text";

function LayersMenu({ onClose }: { onClose: () => void }) {
  const texts = useTexts();
  const layers = useEditor((s) => s.view.layers);
  const setLayer = useEditor((s) => s.setLayer);
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
    </div>
  );
}

/** `onPlayExplosion`: shows the Play explosion button (Hull). */
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
        <button
          type="button"
          className="btn btn--small btn--panel"
          title={texts.art.explosionApprox}
          onClick={onPlayExplosion}
        >
          {texts.art.playExplosion}
        </button>
      )}
      <button
        type="button"
        className="btn btn--small btn--panel"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {texts.canvas.layers}
      </button>
      <button
        type="button"
        className="btn btn--small btn--panel"
        aria-haspopup="dialog"
        onClick={() => setPreview(true)}
      >
        {texts.canvas.preview}
      </button>
    </div>
  );
}
