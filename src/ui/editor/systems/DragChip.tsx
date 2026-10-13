/** The system chip following the pointer while it is dragged from the palette. */
import { useSystemName } from "../../../app/names";
import { useEditor } from "../../../app/store";
import { SystemName } from "../../common/SystemIcon";

export function DragChip() {
  const drag = useEditor((s) => s.systemDrag);
  const nameOf = useSystemName();
  if (!drag) return null;
  const className = ["sy-drag", drag.target === "remove" ? "sy-drag--remove" : ""].join(" ");
  return (
    <div
      className={className}
      data-testid="drag-chip"
      style={{ left: drag.clientX + 12, top: drag.clientY + 12 }}
    >
      <SystemName system={drag.system} name={nameOf(drag.system)} />
    </div>
  );
}
