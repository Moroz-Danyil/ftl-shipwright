/** The status bar: the game data and mod, room and door counts, zoom. */
import { useEditor } from "../../app/store";
import { baseName } from "../../platform/sources";
import { useTexts } from "../../text";

export function StatusBar() {
  const texts = useTexts();
  const game = useEditor((s) => s.game.data);
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const scale = useEditor((s) => s.view.camera.scale);
  const gameText = game
    ? [
        texts.status.game(baseName(game.datPath), game.catalogs.ships.length),
        game.mod ? texts.status.mod(baseName(game.mod.path)) : texts.status.noMod,
      ].join(" · ")
    : "";
  return (
    <footer className="ed-status">
      <span className="ed-status-game">{gameText}</span>
      <span className="mono">
        {texts.status.counts(
          ship?.layout.rooms.length ?? 0,
          ship?.layout.doors.length ?? 0,
          Math.round(scale * 100)
        )}
      </span>
    </footer>
  );
}
