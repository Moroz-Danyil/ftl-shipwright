// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createGameView, memorySource } from "../core";
import { resetEditorStore, useEditor } from "../app/store";
import { pngHeader, systemsGame } from "../testing/systemsFixtures";
import { RacePicture, WeaponPicture } from "./common/ItemPictures";

/** Game data with a weapon whose sheet holds four narrow frames side by side. */
function weaponGame() {
  const game = systemsGame();
  const files = memorySource({
    "img/weapons/laser_sheet.png": pngHeader(48, 30),
    "img/people/human_base.png": pngHeader(140, 70),
  });
  const view = createGameView(files);
  return {
    ...game,
    base: files,
    view,
    catalogs: {
      ...game.catalogs,
      weapons: [
        { name: "LASER_1", weaponArt: "laser", file: "data/blueprints.xml", fromMod: false },
      ],
    },
    animations: {
      ...game.animations,
      sheets: {
        ...game.animations.sheets,
        laser: { name: "laser", path: "img/weapons/laser_sheet.png", w: 48, h: 30, fw: 12, fh: 30 },
      },
      anims: {
        ...game.animations.anims,
        human_walk_down: { name: "human_walk_down", sheet: "human", length: 4, x: 0, y: 0 },
      },
      weaponAnims: { laser: { name: "laser", sheet: "laser", length: 4, x: 1, y: 0 } },
    },
  };
}

beforeEach(() => {
  resetEditorStore();
  const data = weaponGame();
  useEditor.setState({ game: { status: "ready", datPath: data.datPath, data } });
});

describe("item pictures", () => {
  it("shows one weapon frame, turned to point right", async () => {
    const { container } = render(<WeaponPicture name="LASER_1" size={60} />);
    await waitFor(() => expect(container.querySelector("image")).not.toBeNull());
    const outer = container.querySelector("svg.item-pic")!;
    expect(outer).toHaveAttribute("viewBox", "0 0 30 12");
    expect(outer.querySelector("g")).toHaveAttribute("transform", "matrix(0 -1 -1 0 30 12)");
    const frame = outer.querySelector("g > svg")!;
    expect(frame).toHaveAttribute("viewBox", "12 0 12 30");
    expect(frame).toHaveAttribute("width", "12");
    expect(frame).toHaveAttribute("height", "30");
  });

  it("keeps crew pictures upright", async () => {
    const { container } = render(<RacePicture race="human" />);
    await waitFor(() => expect(container.querySelector("image")).not.toBeNull());
    expect(container.querySelector("svg.item-pic")).toHaveAttribute("viewBox", "0 0 35 35");
    expect(container.querySelector("g")).not.toHaveAttribute("transform");
  });
});
