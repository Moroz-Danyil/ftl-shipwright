# Game data: where the editor finds things, and how a mod is written

Companion to [ship-format.md](ship-format.md). Derived from the game's own files (the contents of `ftl.dat`) and from how Slipstream Mod Manager applies mods. Counts in brackets were checked on the vanilla data; **(confirm in game)** marks what the data alone can't prove.

## 1. Sources and layering

- The base game is the PKG archive `ftl.dat`. Its inner paths look like `data/blueprints.xml`, `img/ship/kestral_base.png`.
- A mod is either a folder or a zip (`.ftl` or `.zip`) holding the same tree (`data/`, `img/`, `audio/`, `fonts/`) at its root.
- The editor sees the game **with** the selected mod applied, using Slipstream's rules:

| Mod file                                | Effect on the game file                          |
| --------------------------------------- | ------------------------------------------------ |
| `X.xml.append` or `X.append.xml`        | its content is added to the end of `X.xml`       |
| `X.xml.rawappend` / `X.rawappend.xml`   | same, as raw text                                |
| `X.xml.rawclobber` / `X.rawclobber.xml` | replaces `X.xml`                                 |
| anything else                           | replaces the file with the same path, or adds it |

- Append files may contain Slipstream's advanced `mod:` tags (find/replace instructions). The editor does not run them; it ignores those elements when reading.
- Paths are compared with forward slashes and case-insensitively (the game runs on Windows).

## 2. Texts

- English texts are `<text name="key">value</text>` elements in `data/text_*.xml` (`text_blueprints.xml`, `text_misc.xml`, `text_tooltips.xml`, ...).
- Translations: `data/text-<code>.xml` with the same keys, for `de es fr it ja pl pt ru zh-Hans`.
- An element written as `<title id="key"/>` shows the text with that key; `<title>Words</title>` shows the words directly. Both forms occur in vanilla.
- A key missing from a translation falls back to English.

## 3. Blueprint files

- Blueprints live in `data/blueprints.xml`, `dlcBlueprints.xml`, `dlcBlueprintsOverwrite.xml`, `dlcPirateBlueprints.xml`, `autoBlueprints.xml`, `bosses.xml`. In vanilla no name is defined twice [0 duplicates].
- Mods add blueprints by appending. When a name is defined again, the later definition wins; this is how mods replace an existing ship or item.
- Read order: the files in the order above, each with its appends.

## 4. Ships

- A ship is usable when its layout `.txt` and `.xml` exist [135 of 136; one vanilla blueprint sits inside a comment].
- **Player ships** are the blueprints whose name starts with `PLAYER_SHIP_` [30 usable, including `PLAYER_SHIP_TUTORIAL`; all of them, and only they, have `<weaponSlots>`]. Type B and C variants end in `_2` and `_3`.
- The vanilla hangar only offers the fixed `PLAYER_SHIP_*` names, so a mod ship replaces one of them unless a mod loader adds more slots **(confirm in game)**.
- A ship's display name is its `name` text, falling back to the blueprint name; the line under it is `class`.

## 5. Items (for the loadout pickers and cards)

| Element           | Count | Fields the editor uses                                                                                                                                                                                                                                                     |
| ----------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weaponBlueprint` | 68    | `type` (`LASER BURST BEAM MISSILES BOMB`), `title`, `short`, `desc`, `tooltip`, `damage`, `shots`, `sp` (shield piercing), `fireChance`, `breachChance`, `stunChance`, `ion`, `persDamage`, `sysDamage`, `cooldown`, `power`, `missiles`, `cost`, `weaponArt`, `iconImage` |
| `droneBlueprint`  | 21    | `type`, `title`, `short`, `desc`, `power`, `cost`, `droneImage`, `iconImage`                                                                                                                                                                                               |
| `augBlueprint`    | 32    | `title`, `desc`, `cost`, `stackable`, `value`                                                                                                                                                                                                                              |
| `crewBlueprint`   | 10    | `title`, `short`, `desc`, `cost`, `powerList/power` (text ids of the race's traits)                                                                                                                                                                                        |
| `systemBlueprint` | 16    | `type`, `title`, `desc`, `startPower`, `maxPower`, `cost`                                                                                                                                                                                                                  |

- The blueprint name is the `name` attribute. Text fields use the `id`/inline rule from section 2.
- `fireChance`, `breachChance` and `stunChance` hold 0–10 [all vanilla values]; the game shows them as tens of percent (1 = 10 %).
- Drone `type` values used by equipment: `COMBAT DEFENSE SHIELD BOARDER REPAIR SHIP_REPAIR HACKING BATTLE`. Blueprints whose type starts with `ITEM_` are store items, not equipment.
- Crew races are the `crewBlueprint` names (`human engi mantis rock slug energy anaerobic crystal ...`); mods can add more.

## 6. Animations (pictures for weapons and crew)

- `data/animations.xml` and `data/dlcAnimations.xml` (some races, e.g. `anaerobic`, are only in the second).
- `<animSheet name w h fw fh>path</animSheet>`: a sprite sheet `img/<path>` of `w × h` px cut into frames of `fw × fh`.
- `<anim name>` and `<weaponAnim name>` use a sheet: `<sheet>`, `<desc length x y/>` = `length` frames starting at column `x` of row `y`, where **rows are counted from the bottom of the sheet** (row 0 is the bottom row). Checked on the human sheet: `human_repair` (9 frames, y=7), `human_teleport` (9, y=3) and `human_clone` (6, y=2) only line up with rows counted from the bottom.
- A weapon is drawn with the `weaponAnim` named by its `weaponArt`. Frame 0 is the weapon at rest, `chargedFrame` and `fireFrame` are later frames, and `mountPoint x y` is the pixel of the frame that sits on the ship's mount.
- A crew race's picture is frame 0 of `<race>_walk_down`.
- Crew colours: a race's sheet `img/people/<race>_base.png` can come with layer sheets of the same size and layout, `<race>_layer1.png`, `<race>_layer2.png`, each holding one part of the body in the base's own colours (the human's layer 1 is the shirt, layer 2 the head and hands). The race's `<colorList>` in its `crewBlueprint` has one `<layer>` list of `<color r g b a>` per layer sheet, in order [human 2 lists and 2 sheets; mantis, rock, slug, crystal, energy, anaerobic 1 and 1; the engi neither]. The game picks one colour of each list per crew member and draws the layer over the base with every channel multiplied by `1 - a + a × colour / 255`, so `a = 0` leaves the layer as drawn. Checked on the game's hangar: under (140, 140, 255, a 0.7) a shirt pixel `f0f5f7` shows as `a5a8f7`, and under (90, 60, 40, a 0.7) a hair pixel `895e3b` as `4b2c18`. `<race>_color.png` is a plain white silhouette of the crew member; the colours above do not need it.

## 7. Pictures

- Ship pictures: `img/ship/` (`<img>_base`, `_floor`, `_cloak`, `_gibN`, `_shields1`), enemy hulls in `img/ships_glow/` and `img/ships_noglow/`.
- Room interiors: `img/ship/interior/<name>.png`, named by a system's `img` attribute (e.g. `room_shields_3`). Files with `glow` in the name (`room_cloaking_2_glow.png`, `glow_pilot.png`, ...) are lighting overlays, not choices.
- Ship select icons: `img/customizeUI/miniship_<img>.png` [28].
- Weapon, drone and race pictures come from the animation sheets above; `iconImage` names small icons in `img/icons/`.

## 8. Writing a mod

For a ship with blueprint name `N`, layout `L` and picture base `I` (the floor, cloak and shield pictures use the blueprint's `floorImage`, `cloakImage` and `shieldImage` names instead of `I` when those are set, because that is where the game looks):

```
data/blueprints.xml.append   the <shipBlueprint name="N" layout="L" img="I"> element
data/L.txt                   rooms and doors
data/L.xml                   pictures, mounts, gibs
img/ship/I_base.png          hull
img/ship/I_floor.png         floor (if any)
img/ship/I_cloak.png         cloak (if any)
img/ship/I_gib1.png ...      gibs
img/ship/I_shields1.png      shield (if the ship has its own)
img/customizeUI/miniship_I.png
img/ship/interior/<name>.png only for interiors that are not in the game
```

- Texts are written inline in the blueprint (`<name>My Ship</name>`), so no text file is needed.
- A `.ftl` file is a zip of exactly this tree, without a wrapping folder.
- Saving into a folder that already holds a mod: a blueprint with the same name in its `data/blueprints.xml.append` is replaced in place; otherwise the new one is added at the end (before a closing `</FTL>` if the file is wrapped in one). Other content of that file is left untouched.
- Pictures that are the game's own (same path, same bytes) don't need to be copied.

### Rooms are written from cell (0, 0)

In every ship of the game the smallest room x and the smallest room y are both 0 [69/69 layouts]. The game places the hull picture from the top-left of the rooms, not from cell (0, 0): the hull's corner is at `((X_OFFSET + minX) · 35 + img.x, (Y_OFFSET + minY) · 35 + img.y)`, where `minX`/`minY` are the smallest room x and y. For the game's own ships this is the same as the rule in [ship-format.md](ship-format.md#2-the-grid-and-the-anchor); a layout whose rooms start elsewhere is not.

The rule explains a ship saved from the editor with its only room, 2 × 2, at cell (7, 5), the hull at `img x="-15" y="51"` (440 × 325) and both offsets 0. Measured from the anchor:

|                      | Room (px)  | Hull corner (px) | Room on the hull                                         |
| -------------------- | ---------- | ---------------- | -------------------------------------------------------- |
| editor               | (245, 175) | (-15, 51)        | inside, at (260, 124)                                    |
| game, file as it was | (245, 175) | (230, 226)       | 15 px left of and 51 px above the hull's corner, outside |

which is what the game showed: the room up and to the left, off the hull. The game's battle view also showed the whole ship shifted from where the editor drew it; that would follow if the game also draws the rooms from their top-left, which the data alone can't tell **(confirm in game)**. For a layout whose rooms start at (0, 0) both readings give the same picture.

So the editor writes every layout with the rooms moved to start at (0, 0), keeping everything where it is on the screen:

- rooms and doors move by `(-minX, -minY)` cells;
- `X_OFFSET`/`Y_OFFSET` grow by `(minX, minY)`;
- `img` x/y (measured from the anchor) move by `(-minX · 35, -minY · 35)` px;
- nothing else changes: crew stations are counted inside their room, the shield ellipse is centred on the rooms' bounding box, and the floor and cloak offsets, the weapon mounts and the gibs are measured from the hull picture's corner [section 2 of ship-format.md], which stays where it was.

The example ship is written as `ROOM 0 0 0 2 2`, `X_OFFSET 7`, `Y_OFFSET 5` and `<img x="-260" y="-124" .../>`: room and hull corner are at (245, 175) and (-15, 51) from the old anchor in the game as in the editor. The ship in the editor's memory keeps its numbers; opening the written files shows the same ship at the same place, with the anchor at (7, 5). The game's own ships already start at (0, 0) and are written unchanged.

### Rooms off the screen

No ship of the game has a negative `X_OFFSET` or `Y_OFFSET` (the smallest is 0) [69/69 layouts], and every player ship's rooms lie inside the 19 × 13 cell frame the game shows [28/28 player layouts]. A copy of the Kestrel B with two rooms drawn above that frame was written with `Y_OFFSET -1` (`VERTICAL -16`, rooms from cell (0, 0)), and the game crashed with it **(observed)**. Rooms built past the frame's right and bottom edges did not crash the game; that part of the ship is not visible in battle **(observed)**. So the editor keeps a player ship's rooms below and right of the frame's top and left edges, a cell only partly inside a fractional edge counting as outside, and never left of or above ship pixel 0, which is the cell that becomes `X_OFFSET`/`Y_OFFSET` 0 when the layout is written. With the frame's left edge at cell `-X_OFFSET - HORIZONTAL / 35`, rooms inside that edge alone would already give an offset of 0 or more for any `HORIZONTAL` below 35; the pixel-0 limit covers larger values. The Overview lists rooms above or left of the frame as a problem and rooms past its right or bottom edge as something to check.

## 9. Fonts

The game draws its texts with bitmap fonts in `fonts/*.font` (`HL1`, `HL2`, `JustinFont8`, `JustinFont10`, `JustinFont11Bold`, `JustinFont12Bold`, `c&c`, `c&cnew`, `num_font`; `fonts/ja/` holds the Japanese fonts in the same format, `fonts/zh-Hans/` a TrueType font). A `.font` file is big-endian:

| Offset | Size | Meaning                                                           |
| ------ | ---- | ----------------------------------------------------------------- |
| 0      | 4    | `FONT`                                                            |
| 4      | 1    | version, `1`                                                      |
| 5      | 1    | line height                                                       |
| 6      | 1    | baseline: distance from the top of a line                         |
| 7      | 1    | `0`                                                               |
| 8      | 4    | offset of the glyph table (`24`)                                  |
| 12     | 2    | number of glyphs                                                  |
| 14     | 2    | size of a glyph record (`16`)                                     |
| 16     | 4    | offset of the bitmap (the table is padded with zeros to 64 bytes) |
| 20     | 4    | size of the bitmap; it ends the file                              |

A glyph record (16 bytes): code point (4), x and y of its rectangle in the bitmap (2 + 2), width and height (1 + 1), then three signed 8.8 fixed-point numbers (2 each): the rows above the baseline, the space before the glyph and the space after it. The pen moves by space before + width + space after; the space after is fractional in `HL1` (0.6) and `HL2` (0.4) and whole in the others. Code points are not sorted, and a character can be listed twice (`HL1` has one such pair; the first record is used).

The bitmap starts with a 32-byte header: `TEX` and a line feed, 4 bytes (`02 40 00 00`), width and height (2 + 2), `00 01 00 00`, the offset of the pixels from the header's start (4, `32`), the pixels' size (4), zeros. The pixels are one byte each (0 or 255), row by row from the top; the sizes are powers of two (128 × 256 for `HL1`, 256 × 512 for `num_font`). Every glyph rectangle lies inside the bitmap, and every font has the letters A–Z and the digits [checked on the vanilla fonts].

In the hangar the game draws (checked on a screenshot of the game at twice its size):

| Text                                                               | Font               | Scale |
| ------------------------------------------------------------------ | ------------------ | ----- |
| Start                                                              | `HL2`              | 4     |
| layout buttons (A, B, C), "system not installed"                   | `HL2`              | 3     |
| frame titles, buttons (Rename, List, difficulties, Hide rooms ...) | `HL2`              | 2     |
| the ship's name                                                    | `JustinFont10`     | 2     |
| achievements and Advanced Edition titles                           | `JustinFont12Bold` | 1     |
| crew names, weapon names                                           | `JustinFont8`      | 1     |
| Customize                                                          | `HL1`              | 1     |

A scaled glyph's pixels are drawn as squares, and after each glyph the pen moves by its advance times the scale, rounded to a whole screen pixel (so `HL2` at 3 moves 16 px after an S, not 16.2). The ship's name is spaced one font pixel wider than its font says. Labels on light buttons are dark (`#193133`), the frame titles too; the titles on dark bars are light (`#ebf5e5`); names are white. The buttons are no pictures: the game draws them as light (`#ebf5e5`) rectangles with their corners cut off, the chosen one yellow (`#ffe65e`).
