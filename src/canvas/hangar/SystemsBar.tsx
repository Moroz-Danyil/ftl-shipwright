/**
 * The systems bar under the ship: a box per system installed at the start,
 * with its power bars and its green icon, as the hangar shows them.
 */
import { useEditor } from "../../app/store";
import { HANGAR_PICTURES, SYSTEM_BAR, hangarSystemIconPath, systemColumns } from "./hangarLayout";
import { ScreenPicture } from "./ScreenPicture";

export function SystemsBar() {
  const ship = useEditor((s) => s.doc?.history.present.ship);
  if (!ship) return null;
  const barX = (SYSTEM_BAR.width - SYSTEM_BAR.barWidth) / 2;
  const iconX = (SYSTEM_BAR.width - SYSTEM_BAR.iconSize) / 2;
  return (
    <g data-testid="hangar-systems">
      {systemColumns(ship).map((column) => (
        <g
          key={column.system}
          data-testid={`hangar-system-${column.system}`}
          data-power={column.power}
        >
          <ScreenPicture path={HANGAR_PICTURES.system} x={column.x} y={SYSTEM_BAR.y} />
          {column.bars.map((bar, i) => (
            <rect
              key={i}
              className="hg-power"
              x={column.x + barX}
              y={bar.y}
              width={SYSTEM_BAR.barWidth}
              height={bar.height}
            />
          ))}
          <ScreenPicture
            path={hangarSystemIconPath(column.system)}
            x={column.x + iconX}
            y={SYSTEM_BAR.iconY}
          />
        </g>
      ))}
    </g>
  );
}
