/**
 * Where to start on a ship without rooms, in the middle of the Rooms canvas:
 * draw the first room with the Room tool, then add doors, then put systems
 * in the rooms. It lets the pointer through to the grid below.
 */
import { keyLabel } from "../app/keys";
import { useEditor } from "../app/store";
import { useTexts } from "../text";

export function EmptyShipHint() {
  const texts = useTexts();
  const keys = useEditor((s) => s.keys);
  const t = texts.canvas.emptyShip;
  return (
    <div className="cv-empty-hint" role="note" aria-label={t.title}>
      <span className="cv-empty-title">{t.title}</span>
      <ol className="cv-empty-steps">
        <li>{t.rooms(keyLabel(keys["tool.room"]))}</li>
        <li>{t.doors(keyLabel(keys["tool.door"]))}</li>
        <li>{t.systems}</li>
      </ol>
    </div>
  );
}
