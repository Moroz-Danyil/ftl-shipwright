import { describe, expect, it } from "vitest";
import type { CrewColour } from "../core";
import {
  crewColourIndex,
  crewLayerPaths,
  crewLayers,
  tintFactors,
  tintMatrix,
} from "./crewColours";

const SHIRT: CrewColour = { r: 140, g: 140, b: 255, a: 0.7 };
const SKINS: CrewColour[] = [
  { r: 255, g: 150, b: 150, a: 0.4 },
  { r: 90, g: 60, b: 40, a: 0.7 },
  { r: 255, g: 124, b: 89, a: 0 },
  { r: 255, g: 255, b: 255, a: 0.2 },
];
const human = { name: "human", colorLayers: [[SHIRT], SKINS] };

describe("crew colours", () => {
  it("names a sheet's layer sheets after it", () => {
    expect(crewLayerPaths("img/people/human_base.png", 2)).toEqual([
      "img/people/human_layer1.png",
      "img/people/human_layer2.png",
    ]);
    expect(crewLayerPaths("img/people/odd.png", 1)).toEqual([]);
  });

  it("gives a member the same colour every time, from the layer's list", () => {
    for (let member = 0; member < 12; member++)
      for (const count of [1, 4, 5, 6]) {
        const i = crewColourIndex(member, 1, count);
        expect(i).toBe(crewColourIndex(member, 1, count));
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(count);
      }
    // Neighbours differ while the list lasts.
    const firstFour = [0, 1, 2, 3].map((m) => crewColourIndex(m, 0, 4));
    expect(new Set(firstFour).size).toBe(4);
    expect(crewColourIndex(0, 0, 0)).toBe(-1);
  });

  it("picks one colour per layer from the race's lists", () => {
    const layers = crewLayers(human, "img/people/human_base.png", 0);
    expect(layers).toHaveLength(2);
    expect(layers[0]).toEqual({ path: "img/people/human_layer1.png", colour: SHIRT });
    expect(layers[1].path).toBe("img/people/human_layer2.png");
    expect(SKINS).toContain(layers[1].colour);
    expect(crewLayers(human, "img/people/human_base.png", 0)).toEqual(layers);
  });

  it("leaves races without lists, and pictures borrowed from another race, as they are", () => {
    expect(crewLayers({ name: "engi" }, "img/people/engi_base.png", 0)).toEqual([]);
    expect(crewLayers(undefined, "img/people/human_base.png", 0)).toEqual([]);
    // A race drawn with the human's pictures does not tint them with its own lists.
    const lizard = { name: "lizard", colorLayers: [[SHIRT]] };
    expect(crewLayers(lizard, "img/people/human_base.png", 0)).toEqual([]);
  });

  it("tints a tiny layer as the game does", () => {
    // Pixels of the human's shirt layer, and what the game's hangar shows for them.
    const layer = [
      [0xf0, 0xf5, 0xf7],
      [0xcc, 0xdf, 0xe7],
      [0x63, 0x49, 0x49],
    ];
    const shown = [
      [0xa5, 0xa8, 0xf7],
      [0x8c, 0x98, 0xe7],
      [0x44, 0x32, 0x49],
    ];
    const factors = tintFactors(SHIRT);
    const tinted = layer.map((px) => px.map((c, i) => Math.round(c * factors[i])));
    tinted.forEach((px, p) =>
      px.forEach((c, i) => expect(Math.abs(c - shown[p][i])).toBeLessThanOrEqual(1))
    );
    // Hair under the dark skin colour.
    const hair = tintFactors(SKINS[1]).map((f, i) => Math.round([0x89, 0x5e, 0x3b][i] * f));
    expect(hair.map((c, i) => Math.abs(c - [0x4b, 0x2c, 0x18][i]) <= 1)).toEqual([
      true,
      true,
      true,
    ]);
    // a = 0 leaves the layer as it is.
    expect(tintFactors(SKINS[2])).toEqual([1, 1, 1]);
  });

  it("writes the tint as a colour matrix that keeps the alpha", () => {
    const values = tintMatrix(SHIRT).split(/\s+/).map(Number);
    expect(values).toHaveLength(20);
    const [r, g, b] = tintFactors(SHIRT);
    expect(values[0]).toBeCloseTo(r, 3);
    expect(values[6]).toBeCloseTo(g, 3);
    expect(values[12]).toBeCloseTo(b, 3);
    expect(values[18]).toBe(1);
    expect(values.filter((_, i) => ![0, 6, 12, 18].includes(i)).every((v) => v === 0)).toBe(true);
  });
});
