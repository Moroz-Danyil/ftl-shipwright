/** Ships opened or saved before; a click opens one again. */
import { useState } from "react";
import { openRecentShip } from "../../app/ships";
import { useEditor } from "../../app/store";
import type { RecentShip } from "../../app/settings";
import { usePlatform } from "../../platform/PlatformContext";
import { useTexts, type Texts } from "../../text";
import { ShipIcon } from "../common/ShipIcon";

function where(texts: Texts, entry: RecentShip): string {
  const origin = entry.origin;
  if (origin.kind === "modFile") return texts.start.recentModFile(origin.path);
  if (origin.kind === "modFolder") return texts.start.recentModFolder(origin.path);
  return texts.start.recentGame;
}

export function RecentList() {
  const texts = useTexts();
  const platform = usePlatform();
  const recent = useEditor((s) => s.recent);
  const ready = useEditor((s) => s.game.status === "ready");
  const [busy, setBusy] = useState(false);

  const open = async (entry: RecentShip) => {
    setBusy(true);
    await openRecentShip(platform, texts, entry);
    setBusy(false);
  };

  return (
    <section className="st-recent" aria-label={texts.start.recent}>
      <span className="section-label">{texts.start.recent}</span>
      {recent.length === 0 && <span className="st-hint">{texts.start.recentEmpty}</span>}
      {recent.map((entry) => (
        <button
          key={`${entry.blueprint}|${JSON.stringify(entry.origin)}`}
          type="button"
          className="st-recent-item"
          disabled={!ready || busy}
          onClick={() => void open(entry)}
        >
          <ShipIcon img={entry.img} />
          <span className="st-recent-text">
            <span className="st-recent-name">{entry.name}</span>
            <span className="st-recent-where">{where(texts, entry)}</span>
          </span>
          <span className="st-recent-when">{texts.start.recentWhen(new Date(entry.time))}</span>
        </button>
      ))}
    </section>
  );
}
