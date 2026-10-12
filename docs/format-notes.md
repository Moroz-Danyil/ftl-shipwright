# Format notes

How the core behaves where the game's files leave things open. Companion to [ship-format.md](ship-format.md) and [game-data.md](game-data.md); most points are covered by tests.

## Which ships

- Ship blueprints are read from `blueprints.xml`, `dlcBlueprints.xml`, `dlcBlueprintsOverwrite.xml`, `dlcPirateBlueprints.xml`, `autoBlueprints.xml` and `bosses.xml`, in that order.
- The game's files contain 136 `<shipBlueprint>` tags, but `PLAYER_SHIP_ANAEROBIC_3` sits inside a comment and has no layout files. That leaves 135 ships using 69 layouts; 30 of them are player ships.

## XML

- The game's XML is loose: no root element, several top-level elements, comments containing `--`. The core uses its own small reader that never fails on such input: a closing tag closes the nearest open element with that name, stray closing tags are ignored, and unclosed elements end at the end of the text.
- Comments are not kept. Comments inside an unknown element that is kept verbatim stay with it.
- The five standard entities and numeric references are decoded on reading; `&`, `<`, `>` (and `"` in attributes) are escaped on writing.
- Numbers are written in their shortest form, so `.5` comes back as `0.5` and `1.0` as `1`. The ship is equal after a round trip; only such spellings may differ.
- Writers use `\n` and tabs by default; `{ lineEnding: "\r\n" }` gives the game's own line endings. Every written file ends with a line break.

## Layout `.txt`

- Reading never fails. A word that is not a known keyword is kept, with every value after it up to the next known keyword, and written back after the doors. A known keyword with missing or non-numeric values is kept the same way.
- A keyword that appears twice (other than `ROOM` and `DOOR`): the last one wins.
- A missing `ELLIPSE` reads as zeros; `ELLIPSE` is always written.
- An airlock written `-1, room` is read as `room, -1`, the form the game uses.
- Room ids are stored, not implied by the order, so a file with wrong ids can be reported. The edit helpers keep them `0..n-1`.

## Layout `.xml`

- Always written inside `<FTL>`, in the order `img`, `offsets`, `glowOffset`, `weaponMounts`, `explosion`, then unknown elements. `<offsets>` is left out when there is neither a floor nor a cloak offset; four boss layouts have none.
- The top-level `<glowOffset>` of enemy layouts is kept.
- `<img>` and a mount's `x`/`y` are required. A missing `rotate` or `mirror` reads as `false`, a missing `gib` as `0`, a missing `slide` stays missing.
- Gibs are numbered from their position: `gibs[0]` is written as `<gib1>`.
- Unknown attributes and elements in `<offsets>`, `<mount>`, `<gibN>`, `<weaponMounts>` and `<explosion>` are kept and written back.

## Blueprints

- Unknown child elements (`boardingAI`, `minSector`, ...) are kept as their exact source text and written after the known ones. A second copy of an element that appears once (a second `<health>`) is kept the same way.
- Unknown attributes are kept on `<shipBlueprint>` (the game uses `NOLOC`), systems, `<weaponList>`, `<droneList>` and `<crewCount>`.
- Any element inside `<systemList>` is a system, so systems added by mods load. `power` and `room` are required; `start` accepts `true`, `false`, `1` and `0`.
- A negative station number means no station; six of the game's medbays use `-2`.
- A text element with an `id` attribute is a reference to the game's text files; otherwise its trimmed content is the text.
- Known elements are written in one fixed order: `class name desc unlock systemList weaponSlots droneSlots weaponList droneList aug health maxPower crewCount shieldImage cloakImage floorImage`. The game's own files are not consistent about it.
- Empty weapon and drone lists are written self-closing.

## Geometry

- A missing floor or cloak offset counts as `(0, 0)` from the hull's corner.
- The shield ellipse is centred on the rooms' bounding box plus its offset.
- Where rooms overlap, the first room in the list is the one at a cell.
- Door room ids taken from the geometry are `left/top, right/bottom` for an inner door and `room, -1` for an airlock.

## Validation

- An airlock room is "bigger than 2×2" when it is wider or taller than 2 cells.
- Besides the obvious checks, the core reports doors whose written room ids disagree with the rooms around them, rooms smaller than one cell and systems in rooms that do not exist. Every vanilla ship passes every check.

## Game files

- File access is async; a source's file list is read once.
- If two files differ only in case, the later one wins. A zip with all its files inside one top folder (and nothing under `data/`, `img/`, `audio/`, `fonts/`) has that folder removed.
- Slipstream's `mod:` instructions (elements named `mod:...` or `mod-...:...`) are skipped when reading; their edits are not applied.
- For one game file the mod's `rawclobber` wins, then the mod's ordinary file, then the game's file; appends follow, sorted by path. An append to a file that exists nowhere becomes the whole file. Appends only apply to `.xml` files.
- English texts come from every `data/text_*.xml`, in path order; a later file wins a key.
- Only top-level elements of the blueprint files are definitions (a drone's `<weaponBlueprint>` child is not a weapon). A name defined again keeps its place in the list but takes the later definition's fields.
- Pictures are looked up in `img/ship`, then `img/ships_glow`, then `img/ships_noglow`. Interiors with `glow` in the name are lighting overlays and are not listed.

## Writing mods

- The floor, cloak and shield pictures are written under the blueprint's `floorImage`, `cloakImage` and `shieldImage` names when those are set, because that is where the game looks; otherwise under its `img`.
- Pictures with the same bytes as the game's file at the same path are not written. An interior that differs from the game's replaces it for every ship.
- A new append file holds just the `<shipBlueprint>` element. When merging into an existing one, the last blueprint with the same name is replaced (that is the one the game uses); a new one goes at the end, or before the closing `</FTL>` if the file is wrapped in one. Added line breaks follow the file's style.
