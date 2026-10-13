/**
 * A game and ship for the Hull tests: the Rooms test ship with a
 * 200 × 100 hull picture, a floor, two gibs and the game's pictures to choose
 * from, all with known sizes.
 */
import { createGameView, memorySource, type Mount } from "../core";
import { gamePicture } from "../app/art/model";
import { useEditor } from "../app/store";
import { openTestShip } from "./layoutFixtures";
import { pngHeader, systemsGame } from "./systemsFixtures";

export const HULL = "img/ship/t_base.png";

export function artGameFiles() {
  return memorySource({
    [HULL]: pngHeader(200, 100),
    "img/ship/t_floor.png": pngHeader(180, 80),
    "img/ship/t_gib1.png": pngHeader(100, 100),
    "img/ship/t_gib2.png": pngHeader(100, 100),
    "img/ship/big_base.png": pngHeader(300, 150),
    "img/ship/big_shields1.png": pngHeader(400, 260),
    "img/ship/big_cloak.png": pngHeader(310, 160),
    "img/customizeUI/miniship_big.png": pngHeader(80, 40),
  });
}

/** The test ship with its pictures, open in the store with the game data loaded. */
export function openArtShip(mounts: Mount[] = []): void {
  const ship = openTestShip();
  const files = artGameFiles();
  const view = createGameView(files);
  const data = { ...systemsGame(), base: files, view };
  const withArt = {
    ...ship,
    layoutXml: {
      ...ship.layoutXml,
      img: { x: -10, y: -20, w: 200, h: 100 },
      mounts,
      gibs: [
        {
          velocity: { min: 0, max: 1 },
          direction: { min: 0, max: 90 },
          angular: { min: 0, max: 0 },
          x: 0,
          y: 0,
        },
        {
          velocity: { min: 0, max: 1 },
          direction: { min: 180, max: 270 },
          angular: { min: 0, max: 0 },
          x: 100,
          y: 0,
        },
      ],
    },
  };
  useEditor.setState({ game: { status: "ready", datPath: data.datPath, data } });
  useEditor.getState().openDocument({
    ship: withArt,
    art: {
      source: view,
      hull: gamePicture(HULL),
      floor: gamePicture("img/ship/t_floor.png"),
      gibs: [gamePicture("img/ship/t_gib1.png"), gamePicture("img/ship/t_gib2.png")],
    },
    saved: true,
  });
}
