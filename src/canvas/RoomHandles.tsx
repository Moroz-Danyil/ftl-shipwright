/**
 * The resize handles of the selected room (Rooms, Select tool): small squares
 * of a fixed screen size on its corners and edge middles. The pointer's look
 * over them comes from the tool, which also lets a whole edge be grabbed.
 */
import { roomRectPx } from "../core";
import { useEditor } from "../app/store";
import { HANDLES, HANDLE_SIZE, handlePoint } from "./resizeHandles";
import { resizableRoom } from "./tools/resizeTool";

export function RoomHandles() {
  const room = useEditor(resizableRoom);
  const layout = useEditor((s) => s.doc?.history.present.ship.layout);
  const scale = useEditor((s) => s.view.camera.scale);
  if (!room || !layout) return null;
  const r = roomRectPx(layout, room);
  const side = HANDLE_SIZE / scale;
  return (
    <g className="cv-handles" data-testid="room-handles" data-room={room.id}>
      {HANDLES.map((handle) => {
        const p = handlePoint(r, handle);
        return (
          <rect
            key={handle}
            className="cv-handle"
            data-handle={handle}
            x={p.x - side / 2}
            y={p.y - side / 2}
            width={side}
            height={side}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}
