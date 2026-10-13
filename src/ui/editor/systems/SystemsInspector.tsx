/** The Systems inspector: the palette, and the systems of the selected room. */
import { singleTarget } from "../../../app/selection";
import { useEditor } from "../../../app/store";
import { useTexts } from "../../../text";
import { Palette } from "./Palette";
import { RoomSystems } from "./RoomSystems";

export function SystemsInspector() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const selection = useEditor((s) => s.selection);
  if (!ship) return null;
  const target = singleTarget(selection);
  const room =
    target?.kind === "room" ? ship.layout.rooms.find((r) => r.id === target.id) : undefined;
  return (
    <>
      <div className="ed-heading">
        <span className="eyebrow">{texts.inspector.systems.eyebrow}</span>
        <span className="ed-heading-title">{texts.inspector.systems.title}</span>
      </div>
      <Palette />
      {room ? (
        <RoomSystems ship={ship} room={room} />
      ) : (
        <span className="ed-help">{texts.systems.help}</span>
      )}
    </>
  );
}
