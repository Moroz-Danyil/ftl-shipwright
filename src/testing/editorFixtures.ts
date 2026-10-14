/**
 * Shared set-ups for the app and interface tests: the mini game loaded into
 * the store through a fake platform.
 */
import { loadGameIntoStore } from "../app/gameData";
import { openGameShip } from "../app/ships";
import { resetEditorStore, useEditor } from "../app/store";
import { miniGame } from "../core/testing/miniGame";
import { en } from "../text/en";
import { createFakePlatform, type FakePlatform } from "./fakePlatform";

export const DAT_PATH = "games/ftl/ftl.dat";

/**
 * A fresh store in which the tour counts as offered already, so a ship opens
 * without the offer over it.
 */
export function freshEditorStore(): void {
  resetEditorStore();
  useEditor.setState({ tourOffered: true });
}

/** A fresh store (see `freshEditorStore`) with the mini game loaded. */
export async function withMiniGame(): Promise<FakePlatform> {
  freshEditorStore();
  const platform = createFakePlatform({ [DAT_PATH]: miniGame() });
  const ok = await loadGameIntoStore(platform, en, DAT_PATH, undefined);
  if (!ok) throw new Error(useEditor.getState().game.error);
  return platform;
}

/** A fresh store with the mini game loaded and its player ship open. */
export async function withMiniShipOpen(): Promise<FakePlatform> {
  const platform = await withMiniGame();
  if (!(await openGameShip(en, "PLAYER_SHIP_MINI"))) throw new Error("could not open");
  return platform;
}
