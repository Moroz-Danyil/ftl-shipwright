/**
 * Crew colours, as the game gives them: a race's picture sheet
 * (`img/people/<race>_base.png`) comes with layer sheets of the same layout
 * (`<race>_layer1.png`, `<race>_layer2.png`), each holding the pixels of one
 * part of the body in the base's own colours (the human's layer 1 is the
 * shirt, layer 2 the head). The race's `colorList` has one `<layer>` list per
 * layer sheet, in order; the game picks one colour of each list per crew
 * member and draws the layer over the base, every channel multiplied by
 * `1 - a + a × colour / 255` (so `a` = 0 leaves the layer as it is). This
 * was checked against the game's hangar: a human's shirt pixel f0f5f7 with
 * the colour (140, 140, 255, a 0.7) comes out a5a8f7. Races without layer
 * sheets are drawn as they are. The game picks at random; the editor picks
 * from the crew member's place in the crew list, so a member keeps its
 * colours.
 */
import type { CrewColour, RaceCatalogEntry } from "../core";

/**
 * The layer sheets of a picture sheet: `..._base.png` becomes
 * `..._layer1.png`, `..._layer2.png` ... (`count` of them); none for a sheet
 * named otherwise.
 */
export function crewLayerPaths(sheetPath: string, count: number): string[] {
  const match = /^(.*)_base\.png$/i.exec(sheetPath);
  if (!match) return [];
  return Array.from({ length: count }, (_, i) => `${match[1]}_layer${i + 1}.png`);
}

/** Which of `count` colours crew member `member` gets for layer `layer`: always the same, and different for neighbours. */
export function crewColourIndex(member: number, layer: number, count: number): number {
  if (count <= 0) return -1;
  // Stepping by 7 runs through every colour of lists up to 6 long before repeating.
  return (((member * 7 + layer) % count) + count) % count;
}

/** A layer sheet and the colour it is tinted with. */
export interface CrewLayer {
  path: string;
  colour: CrewColour;
}

/**
 * The tinted layers of crew member `member` of a race drawn from a picture
 * sheet. Empty when the sheet is not the race's own (a race without
 * pictures is drawn as a human) or the race has no colour lists.
 */
export function crewLayers(
  race: Pick<RaceCatalogEntry, "name" | "colorLayers"> | undefined,
  sheetPath: string,
  member: number
): CrewLayer[] {
  const lists = race?.colorLayers;
  if (!race || !lists?.length) return [];
  const file = sheetPath.slice(sheetPath.lastIndexOf("/") + 1).toLowerCase();
  if (!file.startsWith(`${race.name.toLowerCase()}_`)) return [];
  const paths = crewLayerPaths(sheetPath, lists.length);
  return paths.flatMap((path, layer) => {
    const list = lists[layer];
    const index = crewColourIndex(member, layer, list.length);
    return index < 0 ? [] : [{ path, colour: list[index] }];
  });
}

/** How much each of red, green and blue is multiplied by when tinted with a colour. */
export function tintFactors(colour: CrewColour): [number, number, number] {
  const a = Math.min(1, Math.max(0, colour.a));
  const f = (c: number) => 1 - a + (a * Math.min(255, Math.max(0, c))) / 255;
  return [f(colour.r), f(colour.g), f(colour.b)];
}

/** The `feColorMatrix` values that tint a layer with a colour (alpha unchanged). */
export function tintMatrix(colour: CrewColour): string {
  const [r, g, b] = tintFactors(colour).map((v) => Number(v.toFixed(4)));
  return `${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`;
}
