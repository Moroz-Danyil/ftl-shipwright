/**
 * The ship core: the data model, reading and writing the game's ship files,
 * geometry, validation and immutable edit helpers. No UI code in here.
 */
export * from "./model";
export { ShipFormatError } from "./errors";
export { isModInstruction } from "./xml";
export type { WriteOptions } from "./options";
export { parseLayoutTxt, writeLayoutTxt } from "./layoutTxt";
export { parseLayoutXml, writeLayoutXml } from "./layoutXml";
export {
  findShipBlueprints,
  parseShipBlueprint,
  replaceShipBlueprint,
  writeShipBlueprint,
  type BlueprintWriteOptions,
  type ShipBlueprintLocation,
} from "./blueprint";
export * from "./geometry";
export * from "./validation";
export * from "./ship";

// Game files: the base game, mod folders and archives, and the game with a mod applied.
export * from "./data/sources";
export * from "./data/gameView";
export { readTopLevelElements, readGameText, type LayeredElement } from "./data/xmlLayers";

// Texts, catalogs, animations and pictures of the modded game; loading a ship from it.
export * from "./data/texts";
export * from "./data/catalogs";
export * from "./data/animations";
export * from "./data/pictures";
export * from "./data/loadShip";
