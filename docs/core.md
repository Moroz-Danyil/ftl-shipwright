# The ship core

`src/core` holds everything the editor knows about FTL ships, without any UI code: a plain-data model of a ship, pure functions that read and write the game's ship files, geometry and validation helpers, access to the game data (with a mod applied) and writing a ship as a mod.

- The file formats are described in [ship-format.md](ship-format.md) and [game-data.md](game-data.md).
- How the core behaves where the game leaves things open: [format-notes.md](format-notes.md).
- Everything is exported from `src/core/index.ts`.
- The core runs in the app's window and in Node tests: it has no Node-only imports, and platform access (files, the game archive) is passed in.

## Tests

```sh
npm test
```

The tests that need the game's data are skipped unless you point them at it:

| Variable        | Value                                                           |
| --------------- | --------------------------------------------------------------- |
| `FTL_DATA_ROOT` | a folder with the game's unpacked `data/` and `img/` folders    |
| `FTL_DAT_PATH`  | the game's `ftl.dat` (read only), for one optional archive test |

With `FTL_DATA_ROOT` set, every vanilla ship is read, written and read again, and the geometry is checked against the game's pictures.

## Example

```ts
import {
  addDoor,
  addRoom,
  findShipBlueprints,
  loadShip,
  replaceShipBlueprint,
  saveShip,
  updateSystem,
  validateShip,
} from "./core";

// 1. Load a ship from its three texts.
const blueprintsFile = readText("data/blueprints.xml");
const location = findShipBlueprints(blueprintsFile).find((b) => b.name === "PLAYER_SHIP_HARD")!;
let ship = loadShip({
  blueprintXml: location.xml,
  layoutTxt: readText(`data/${location.layout}.txt`),
  layoutXml: readText(`data/${location.layout}.xml`),
});

// 2. Change it. Every edit returns a new ship and leaves the old one as it was.
ship = addRoom(ship, { x: 17, y: 2, w: 2, h: 1 }); // gets the next id
ship = addDoor(ship, { x: 17, y: 2, vertical: true }); // room ids from the geometry
ship = updateSystem(ship, 0, { power: 2 });
ship = { ...ship, blueprint: { ...ship.blueprint, health: 25 } }; // plain data

console.log(validateShip(ship)); // [] or a list of problems

// 3. Write it back.
const files = saveShip(ship, { lineEnding: "\r\n" });
writeText(`data/${ship.blueprint.layout}.txt`, files.layoutTxt);
writeText(`data/${ship.blueprint.layout}.xml`, files.layoutXml);
writeText(
  "data/blueprints.xml",
  replaceShipBlueprint(blueprintsFile, location, files.blueprintXml.trimEnd())
);
```

`readText` and `writeText` stand for whatever file access the caller has.

## Data model (`model.ts`)

All types are plain objects: no classes, no methods, no hidden state. Optional properties are absent when the file did not have them, and the writers leave them out again. Treat values as immutable.

| Type            | File              | Contents                                                                                                                                                                                                                      |
| --------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ship`          |                   | `{ blueprint, layout, layoutXml }`                                                                                                                                                                                            |
| `ShipLayout`    | `<layout>.txt`    | anchor `xOffset?`/`yOffset?` (cells), screen shift `horizontal?`/`vertical?` (px), `ellipse`, `rooms`, `doors`, `extraKeywords?` (unknown keywords, kept as text)                                                             |
| `Room`          |                   | `{ id, x, y, w, h }` in cells                                                                                                                                                                                                 |
| `Door`          |                   | `{ x, y, roomA, roomB, vertical }`; inner doors keep the file's order, airlocks are always `room, -1`                                                                                                                         |
| `ShieldEllipse` |                   | `{ halfWidth, halfHeight, offsetX, offsetY }` in px                                                                                                                                                                           |
| `ShipLayoutXml` | `<layout>.xml`    | `img` (hull picture rect from the anchor), `floorOffset?`, `cloakOffset?`, `glowOffset?`, `mounts`, `gibs`, and `extra*` fields that keep unknown content verbatim                                                            |
| `Mount`         |                   | `{ x, y, rotate, mirror, gib, slide? }` in hull pixels                                                                                                                                                                        |
| `Gib`           |                   | `{ velocity, direction, angular, x, y, glowOffset? }`; gib N is `gibs[N-1]`                                                                                                                                                   |
| `ShipBlueprint` | `<shipBlueprint>` | `name`, `layout`, `img`, `texts`, `systems`, `weaponSlots?`, `droneSlots?`, `weaponList?`, `droneList?`, `augments`, `health?`, `maxPower?`, `crew`, `shieldImage?`, `cloakImage?`, `floorImage?`, `extraElements` (verbatim) |
| `ShipText`      |                   | `{ kind: "id", id }` (a key in the game's text files) or `{ kind: "text", text }`                                                                                                                                             |
| `ShipSystem`    |                   | `{ system, power, room, start?, max?, img?, weapon?, slot? }`; several systems may share a room                                                                                                                               |
| `StationSlot`   |                   | `{ number?, direction? }`; `number = y · w + x` inside the room, negative = no station                                                                                                                                        |
| `CrewCount`     |                   | `{ amount, race, max? }` (`race` is the file's `class` attribute)                                                                                                                                                             |

## Reading and writing files

All are pure functions on strings. `parseLayoutTxt` never throws; the XML readers throw `ShipFormatError` when a file cannot be turned into the model. Writers never throw.

| Function                                             |                                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `parseLayoutTxt(text)` / `writeLayoutTxt(layout)`    | the layout `.txt`, written one token per line in the game's keyword order                    |
| `parseLayoutXml(text)` / `writeLayoutXml(xml)`       | the layout `.xml`, with or without an `<FTL>` root on reading, always wrapped on writing     |
| `parseShipBlueprint(xml)` / `writeShipBlueprint(bp)` | one `<shipBlueprint>` element                                                                |
| `findShipBlueprints(fileText)`                       | every ship blueprint in a blueprints file, with its position; commented-out ones are skipped |
| `replaceShipBlueprint(fileText, location, xml)`      | puts a rewritten blueprint back without touching the rest of the file                        |
| `loadShip(files)` / `saveShip(ship)`                 | the three files of a ship together                                                           |

Writers take `{ lineEnding?: "\n" | "\r\n", indent?: string }` (default `"\n"` and a tab).

## Geometry (`geometry.ts`)

`CELL_SIZE = 35`. Ship pixels are the game's coordinates (a room at cell `(x, y)` is at `((xOffset + x) · 35, (yOffset + y) · 35)`); hull pixels are measured from the hull picture's top-left corner.

| Function                                                                                                               | Returns                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `anchorCells`, `anchorPx`, `cellToPx`, `pxToCell`                                                                      | the anchor and cell ⇄ pixel conversions                      |
| `roomRectPx`, `roomContainsCell`, `roomAtCell`, `roomsBoundsCells`, `roomsBoundsPx`                                    | rooms in pixels, hit tests, bounding boxes                   |
| `shieldEllipsePx`                                                                                                      | the shield ellipse in ship pixels                            |
| `hullRectPx`, `hullToShipPx`, `shipToHullPx`, `floorPositionPx`, `cloakPositionPx`, `mountPositionPx`, `gibPositionPx` | where the pictures, mounts and gibs are                      |
| `doorCells`, `doorSegmentPx`, `doorSides`, `doorRooms`, `doorMatchesGeometry`                                          | the cells and wall of a door, and the rooms on its two sides |
| `stationCellToXY`, `stationXYToCell`, `stationInRoom`, `stationCellPx`                                                 | crew station cells                                           |

## Validation (`validation.ts`)

Each check returns a list of `{ code, message, rooms?, door?, system? }` and never throws: `room-overlap`, `room-ids`, `room-size`, `door-no-room`, `door-rooms-mismatch`, `airlock-large-room`, `station-outside-room`, `system-unknown-room`. `validateLayout` and `validateShip` run all of them.

## Edits (`ship.ts`)

Each takes a ship and returns a new one that shares the unchanged parts, so `a.layout === b.layout` means the layout did not change.

| Function                                                          |                                                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `createShip({ name, layout, img })`                               | an empty ship                                                                 |
| `updateBlueprint`, `updateLayout`, `updateLayoutXml`, `setAnchor` | general changes                                                               |
| `addRoom`, `updateRoom`, `removeRoom`                             | rooms; removing one also removes its doors and systems and keeps ids `0..n-1` |
| `addDoor`, `updateDoor`, `removeDoor`, `syncDoorRooms`            | doors, with room ids taken from the geometry                                  |
| `addSystem`, `updateSystem`, `removeSystem`                       | systems                                                                       |
| `addMount`, `updateMount`, `removeMount`                          | weapon mounts                                                                 |

## Game data (`data/`)

Everything that touches files is async. Paths use forward slashes and are matched case-insensitively.

- **File sources** (`FileSource`: `list`, `has`, `readBytes`, `readText`): `memorySource`, `zipSource` (`.ftl` / `.zip`), `folderSource(root, { listFiles, readFile })` and `datSource(datPath, { listEntries, readEntry })`, where the app passes in its own file functions.
- **The modded game**: `createGameView(base, mod?)` is a file source for the game with a mod applied; `readLayers` and `isFromMod` tell where each part of a file came from. `readTopLevelElements` reads a game XML file layer by layer.
- **Texts**: `loadTexts(view, language?)`, `lookupText`, `resolveText`.
- **Catalogs**: `loadCatalogs(view, texts?)` gives `ships`, `weapons`, `drones`, `augments`, `races` and `systems`, each entry with `name`, `file` and `fromMod`.
- **Animations**: `loadAnimations`, `sheetFrameRect` (rows counted from the bottom), `animFrame`, `weaponRestingFrame` (with the mount point), `raceWalkDownFrame`.
- **Pictures and ships**: `listInteriors`, `listShipPictures`, `listMiniships`, `findShipPicturePath`, `loadShipFromGame(view, name)`, `findShipPictures`.

## Writing a mod (`mod/`)

| Function                                  |                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `buildShipMod({ ship, pictures, game? })` | the files of the mod; pictures identical to the game's are left out         |
| `buildShipModForFolder(input, folder)`    | the same, merged into the folder's existing `data/blueprints.xml.append`    |
| `mergeBlueprintAppend(existing, xml)`     | replaces the ship with the same name in place, otherwise adds it at the end |
| `zipMod(files)`                           | `.ftl` bytes                                                                |
| `shipPicturePaths(ship)`                  | where each picture goes in the mod                                          |
