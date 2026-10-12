# FTL ship files: what the editor reads and writes

This describes how _FTL: Faster Than Light_ stores a ship, as far as the editor needs it. Every rule here was derived from the game's own data (the files inside `ftl.dat`) and checked against all vanilla ships; the numbers in brackets say how many cases were checked. Rules the data alone can't prove are marked **(confirm in game)**.

## 1. The files of one ship

A ship is a `<shipBlueprint>` element plus a layout and pictures:

| What                            | Where                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blueprint                       | an element in `data/blueprints.xml` (also `dlcBlueprints.xml`, `dlcBlueprintsOverwrite.xml`, `dlcPirateBlueprints.xml`, `autoBlueprints.xml`, `bosses.xml`) |
| Rooms and doors                 | `data/<layout>.txt`                                                                                                                                         |
| Picture placement, mounts, gibs | `data/<layout>.xml`                                                                                                                                         |
| Hull picture                    | `img/ship/<img>_base.png`                                                                                                                                   |
| Floor picture                   | `img/ship/<floorImage or img>_floor.png` (optional)                                                                                                         |
| Cloak picture                   | `img/ship/<cloakImage or img>_cloak.png`                                                                                                                    |
| Shield picture                  | `img/ship/<shieldImage or img>_shields1.png` (player ships)                                                                                                 |
| Gib pictures                    | `img/ship/<img>_gib<N>.png`, N = 1, 2, ...                                                                                                                  |
| Ship select icon                | `img/customizeUI/miniship_<img>.png` (player ships)                                                                                                         |
| Room interiors                  | `img/ship/interior/<name>.png`, where `<name>` is a system's `img` attribute                                                                                |

`<layout>` and `<img>` are the `layout` and `img` attributes of `<shipBlueprint name="..." layout="..." img="...">` [135 blueprints, all three attributes always present].

Mods are applied by Slipstream Mod Manager: a mod is a zip (`.ftl`) or folder with the same `data/` and `img/` tree. A file named `X.xml.append` is merged into the game's `X.xml` (so a new ship's blueprint goes into `data/blueprints.xml.append`); any other file replaces or adds the file with the same path.

## 2. The grid and the anchor

- The game works in cells of **35 × 35 px**.
- A room at cell `(x, y)` is drawn at pixel `((X_OFFSET + x) · 35, (Y_OFFSET + y) · 35)`. `X_OFFSET` / `Y_OFFSET` (cells, from the layout `.txt`) are the ship's **anchor**; a missing value means 0 [39 of 69 layouts have neither].
- The **hull picture**'s top-left corner is at `(X_OFFSET · 35 + img.x, Y_OFFSET · 35 + img.y)`, where `img.x`/`img.y` come from `<img>` in the layout `.xml`. Its `w`/`h` equal the picture's size [28/28 player ships; some enemy layouts differ from their picture].
- The **floor picture** is drawn at hull corner + `<offsets><floor x y/>`. With the two rules above, the floor's visible pixels extend 6 px beyond the rooms on every side [16 of 20 ships exact, 3 within 2 px]. The exception is the Kestrel (`kestral`), whose 3×2 cockpit room reaches past the right edge of its floor picture.
- The **cloak picture** is drawn at hull corner + `<offsets><cloak x y/>`; its visible area is then centred on the hull's, within 3 px for player ships and 4 px for enemies. Values can be negative (a bigger cloak picture starts above-left of the hull).
- **Mounts** and **gibs** use pixels relative to the hull picture's top-left corner: every mount lies inside the hull picture, and the gibs placed at their `x`/`y` cover the hull completely [28/28 ships].

## 3. Layout `.txt`

Whitespace-separated tokens (vanilla puts every token on its own line). Keywords and the number of values after each:

| Keyword      | Values | Meaning                                                          |
| ------------ | ------ | ---------------------------------------------------------------- |
| `X_OFFSET`   | 1      | anchor x, cells (optional)                                       |
| `Y_OFFSET`   | 1      | anchor y, cells (optional)                                       |
| `HORIZONTAL` | 1      | horizontal pixel shift of the ship in the game window (optional) |
| `VERTICAL`   | 1      | vertical pixel shift (always present in vanilla)                 |
| `ELLIPSE`    | 4      | shield ellipse: half-width, half-height, x offset, y offset (px) |
| `ROOM`       | 5      | `id x y w h` (cells)                                             |
| `DOOR`       | 5      | `x y roomA roomB vertical`                                       |

- Order in vanilla: `X_OFFSET Y_OFFSET VERTICAL HORIZONTAL ELLIPSE`, then all `ROOM`s, then all `DOOR`s (absent keywords skipped) [69/69]. Write in this order.
- Room ids are `0 .. n-1` in file order [69/69]. Sizes in vanilla: 2×1, 1×2, 2×2 and one 3×2 [851 rooms].
- `HORIZONTAL` and `VERTICAL` only move the ship on the game screen; the editor keeps them as they are.

### Doors

`DOOR x y a b v`:

- `v = 1` (vertical door): it sits on the vertical wall line `x`, between cell columns `x-1` and `x`, in cell row `y`.
- `v = 0` (horizontal door): it sits on the horizontal wall line `y`, between cell rows `y-1` and `y`, in cell column `x`.
- `a` and `b` are the ids of the two rooms on either side. For an inner door either order appears [749 left/top first, 161 the other way].
- An **airlock** (a door to space) is always written `room, -1`, whichever side the space is on [202/202].
- Vanilla airlocks are only on 2×1 and 2×2 rooms [111 rooms]; a bigger room only partly vents in the game (seen in game).

### Shield ellipse

- The shield picture is `2·half-width × 2·half-height`, within 2 px [10/10].
- The ellipse centre is the centre of the rooms' bounding box plus the x/y offset; in 10 of 12 player ships the offset moves it towards the hull's centre **(confirm in game)**.

## 4. Layout `.xml`

```xml
<img x="-59" y="-103" w="652" h="418"/>
<offsets>
  <floor x="45" y="93"/>   <!-- optional [30 of 135] -->
  <cloak x="19" y="19"/>
</offsets>
<weaponMounts>
  <mount x="540" y="155" rotate="true" mirror="true" gib="6" slide="up"/>
</weaponMounts>
<explosion>
  <gib1>
    <velocity min="0.6" max="1"/>
    <direction min="60" max="120"/>
    <angular min="-0.4" max="-0.1"/>
    <x>-5</x>
    <y>114</y>
    <glowOffset x=".." y=".."/>   <!-- optional, enemy ships -->
  </gib1>
</explosion>
```

- A file may have no root element or be wrapped in `<FTL>` [135 wrapped]. Comments occur and must be ignored.
- `<mount>`: `x`, `y` (hull pixels), `rotate`, `mirror` (`true`/`false`), `gib` (the gib number the mount flies off with), `slide` (`up`, `down`, `left`, `right`, `no`; sometimes absent) [325 mounts in 69 layouts]. The n-th equipped weapon is drawn on the n-th mount.
- Every vanilla player ship has at least as many mounts as weapon slots.
- `<gibN>` numbering starts at 1; vanilla ships have 4 or 6 gibs.

## 5. Blueprint

```xml
<shipBlueprint name="PLAYER_SHIP_HARD" layout="kestral" img="kestral">
  <class id="ship_PLAYER_SHIP_KESTREL_class"/>    <!-- or <class>Text</class> -->
  <name id="..."/>  <desc id="..."/>  <unlock id="..."/>
  <systemList>
    <pilot power="1" room="0" start="true" img="room_pilot">
      <slot><direction>right</direction><number>0</number></slot>
    </pilot>
    <medbay power="1" room="4" start="true"><slot><number>1</number></slot></medbay>
    <artillery power="1" room="7" weapon="ARTILLERY_FED"/>
    ...
  </systemList>
  <weaponSlots>4</weaponSlots>
  <droneSlots>2</droneSlots>
  <weaponList count="2" missiles="8"> <weapon name="MISSILES_2_PLAYER"/> </weaponList>
  <droneList count="1" drones="2"> <drone name="..."/> </droneList>
  <aug name="..."/>
  <health amount="30"/>
  <maxPower amount="8"/>
  <crewCount amount="3" class="human"/>
  <shieldImage>kestral</shieldImage> <cloakImage>...</cloakImage> <floorImage>...</floorImage>
</shipBlueprint>
```

- Texts (`class`, `name`, `desc`, `unlock`) are either `id="..."` pointing into the game's text files or inline text; both forms occur.
- Systems: `pilot doors sensors medbay clonebay oxygen weapons shields engines drones cloaking battery hacking mind teleporter artillery`. Attributes: `power` (starting level), `room`, `start`, `max` (enemy ships), `img` (room interior picture), `weapon` (artillery only).
- `start="false"` means the ship has the room for the system but the system must be bought. Player ships almost always write `start` [442 of 445 systems]; enemy ships leave it out, which means installed.
- Several systems may name the same room (vanilla: medbay + clonebay, mind control + teleporter).
- `<slot>` is the crew station: `number` is the cell inside the room, counted row by row from the top-left (`cell = y · w + x`), and `direction` (`up`, `down`, `left`, `right`) is where the crew member faces, which in vanilla is the room's wall [127/129]. Medbay and clonebay write only `number` [37]; a negative number (some medbays use `-2`) means no station.
- Vanilla values: weapon slots 2–4, drone slots 2–3, crew 1–6. Higher limits are the editor's choice.
- `crewCount` may repeat (one per race) and may have `max`.
- `shieldImage` / `cloakImage` / `floorImage` hold a picture base name; without them the ship's `img` is used.
