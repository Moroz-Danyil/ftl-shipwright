/**
 * Loading the game data: the archive, the optional mod, texts, catalogs and
 * animations.
 */
import { createGameView, loadAnimations, loadCatalogs, loadTexts } from "../core";
import { gameArchiveSource, modSource } from "../platform/sources";
import type { ModRef, Platform } from "../platform/types";
import type { Texts } from "../text";
import { reasonOf } from "./errors";
import { saveDatPath, saveMod } from "./settings";
import { useEditor, type GameData, type LoadStep } from "./store";

/** Reads everything the editor needs from the game, reporting each step. */
export async function loadGameData(
  platform: Platform,
  datPath: string,
  mod: ModRef | undefined,
  onStep: (step: LoadStep) => void = () => {}
): Promise<GameData> {
  onStep("archive");
  const base = gameArchiveSource(platform, datPath);
  await base.list();
  let modFiles;
  if (mod) {
    onStep("mod");
    modFiles = await modSource(platform, mod);
    await modFiles.list();
  }
  const view = createGameView(base, modFiles);
  onStep("texts");
  const texts = await loadTexts(view);
  onStep("catalogs");
  const catalogs = await loadCatalogs(view, texts);
  onStep("animations");
  const animations = await loadAnimations(view);
  return { datPath, mod, base, view, texts, catalogs, animations };
}

let loadToken = 0;

/**
 * Loads the game data into the store and remembers the paths once it worked.
 * A later call wins over one still running.
 */
export async function loadGameIntoStore(
  platform: Platform,
  texts: Texts,
  datPath: string,
  mod: ModRef | undefined
): Promise<boolean> {
  const token = ++loadToken;
  const store = useEditor.getState();
  store.setGame({ datPath, mod, status: "loading", step: undefined, error: undefined });
  try {
    const data = await loadGameData(platform, datPath, mod, (step) => {
      if (token === loadToken) useEditor.getState().setGame({ step });
    });
    if (token !== loadToken) return false;
    useEditor.getState().setGame({ status: "ready", step: undefined, data });
    saveDatPath(datPath);
    saveMod(mod);
    return true;
  } catch (error) {
    if (token !== loadToken) return false;
    useEditor.getState().setGame({
      status: "error",
      step: undefined,
      data: undefined,
      error: texts.gameData.error(reasonOf(error, texts.errors.unknown)),
    });
    return false;
  }
}
