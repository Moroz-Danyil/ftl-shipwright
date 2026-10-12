/**
 * The game data card: the game's ftl.dat, how many ships it has, and the
 * optional mod.
 */
import { useState } from "react";
import { loadGameIntoStore } from "../../app/gameData";
import { useEditor, type LoadStep } from "../../app/store";
import { usePlatform } from "../../platform/PlatformContext";
import type { ModRef } from "../../platform/types";
import { useTexts } from "../../text";

const STEPS: LoadStep[] = ["archive", "mod", "texts", "catalogs", "animations"];

function LoadProgress({ step }: { step: LoadStep | undefined }) {
  const texts = useTexts();
  const done = step ? STEPS.indexOf(step) : 0;
  return (
    <>
      <span className="st-hint" role="status">
        {step ? texts.gameData.steps[step] : texts.gameData.loading}
      </span>
      <div className="st-progress" aria-hidden="true">
        <div
          className="st-progress-bar"
          style={{ width: `${((done + 1) / (STEPS.length + 1)) * 100}%` }}
        />
      </div>
    </>
  );
}

function ArchiveStatus() {
  const texts = useTexts();
  const game = useEditor((s) => s.game);
  if (game.status === "loading") return <LoadProgress step={game.step} />;
  if (game.status === "error") return <span className="st-error">{game.error}</span>;
  if (game.status === "ready" && game.data)
    return <span className="st-ok">{texts.gameData.found(game.data.catalogs.ships.length)}</span>;
  return null;
}

export function GameDataCard() {
  const texts = useTexts();
  const platform = usePlatform();
  const game = useEditor((s) => s.game);
  const [modMenu, setModMenu] = useState(false);
  const loading = game.status === "loading";

  const load = (datPath: string, mod: ModRef | undefined) =>
    void loadGameIntoStore(platform, texts, datPath, mod);

  const chooseDat = async () => {
    const path = await platform.pickFile({
      filters: [{ name: texts.gameData.datFilter, extensions: ["dat"] }],
      defaultPath: game.datPath,
    });
    if (path) load(path, game.mod);
  };

  const chooseMod = async (kind: ModRef["kind"]) => {
    setModMenu(false);
    if (!game.datPath) return;
    const path =
      kind === "folder"
        ? await platform.pickFolder()
        : await platform.pickFile({
            filters: [{ name: texts.gameData.modFilter, extensions: ["ftl", "zip"] }],
          });
    if (path) load(game.datPath, { kind, path });
  };

  return (
    <section className="st-card" aria-label={texts.gameData.title}>
      <span className="st-card-title">{texts.gameData.title}</span>
      <div className="st-entry">
        <span className="eyebrow">{texts.gameData.archive}</span>
        {game.datPath ? (
          <span className="st-path">{game.datPath}</span>
        ) : (
          <>
            <span>{texts.gameData.notChosen}</span>
            <span className="st-hint">{texts.gameData.askDat}</span>
          </>
        )}
        <ArchiveStatus />
      </div>
      <div className="st-entry">
        <span className="eyebrow">{texts.gameData.mod}</span>
        {game.mod ? (
          <span className="st-path">
            {game.mod.kind === "folder"
              ? texts.gameData.modFolder(game.mod.path)
              : texts.gameData.modFile(game.mod.path)}
          </span>
        ) : (
          <span>{texts.gameData.modNone}</span>
        )}
      </div>
      <div className="st-buttons">
        <button
          type="button"
          className={game.datPath ? "btn" : "btn btn--primary"}
          disabled={loading}
          onClick={() => void chooseDat()}
        >
          {game.datPath ? texts.gameData.changeDat : texts.gameData.chooseDat}
        </button>
        {game.datPath && (
          <button
            type="button"
            className="btn"
            disabled={loading}
            aria-expanded={modMenu}
            onClick={() => setModMenu(!modMenu)}
          >
            {game.mod ? texts.gameData.changeMod : texts.gameData.addMod}
          </button>
        )}
        {game.datPath && game.mod && (
          <button
            type="button"
            className="btn"
            disabled={loading}
            onClick={() => load(game.datPath!, undefined)}
          >
            {texts.gameData.removeMod}
          </button>
        )}
        {game.status === "error" && game.datPath && (
          <button type="button" className="btn" onClick={() => load(game.datPath!, game.mod)}>
            {texts.gameData.retry}
          </button>
        )}
        {modMenu && (
          <div className="st-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              className="btn"
              onClick={() => void chooseMod("folder")}
            >
              {texts.gameData.pickModFolder}
            </button>
            <button
              type="button"
              role="menuitem"
              className="btn"
              onClick={() => void chooseMod("zip")}
            >
              {texts.gameData.pickModFile}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
