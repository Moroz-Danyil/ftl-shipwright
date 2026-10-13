/**
 * A system's icon from the game (the one the game draws in rooms), on a dark
 * chip so its white pictogram reads in both themes. Shown next to the
 * system's name, never instead of it.
 */
import { useEditor } from "../../app/store";
import { systemIconPath } from "../../canvas/gameLook";
import { usePicture } from "../../canvas/pictures";

export function SystemIcon({ system, size = 20 }: { system: string; size?: number }) {
  const view = useEditor((s) => s.game.data?.view);
  const picture = usePicture(view, systemIconPath(system));
  return (
    <span
      className="sys-icon"
      data-testid={`ui-icon-${system}`}
      data-loaded={picture ? true : undefined}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {picture && <img src={picture.url} alt="" draggable={false} />}
    </span>
  );
}

/** An icon followed by the system's name. */
export function SystemName({ system, name }: { system: string; name: string }) {
  return (
    <span className="sys-name">
      <SystemIcon system={system} />
      <span>{name}</span>
    </span>
  );
}
