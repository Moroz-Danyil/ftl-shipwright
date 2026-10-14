# The interface

How FTL Shipwright looks and behaves. The editor is built around **workspaces**: the ship itself, its rooms and its hull each have their own, and each shows only the tools and settings it needs.

## Look

- Dark theme: graphite background, one amber accent for selection and the main action; airlock doors blue, problems red, things bought later amber.
- A light theme with the same layout: soft greys rather than white, the same amber accent darkened for contrast.
- Typefaces: IBM Plex Sans for text, IBM Plex Mono for numbers, ids and keys.
- Pictograms: every section title in the inspector, sub-headings such as Save name, and the ship's stats have a small picture before their text, on a dark chip so it reads in both themes. Where the game has a fitting picture it is the game's own (the weapons and drones system icons, the missile and drone part icons); otherwise a line icon in the style of the tool icons, and a tool's icon for its help and for what it works on (mounts, explosion pieces, the picture to move). They never replace the text.
- Every piece of text comes from one English dictionary, so translations can be added later.

| Token      | Value     | Use                                    |
| ---------- | --------- | -------------------------------------- |
| background | `#101318` | window                                 |
| canvas     | `#0C0F13` | behind the ship, with a faint dot grid |
| panel      | `#171B22` | bars and side panels                   |
| raised     | `#1D222B` | cards and groups inside panels         |
| line       | `#2A313C` | borders                                |
| text       | `#E7EAEF` |                                        |
| muted text | `#A3ACB9` | labels and hints                       |
| accent     | `#F2A93B` | selection, main button                 |
| airlock    | `#6CB4F5` | doors to space                         |

## Start screen

Shown when no ship is open.

- **New ship**: start from an empty hull or from a copy of any ship in the game. The copy gets its own name and never overwrites the original.
- **Open a ship**: pick a ship from the game or from the chosen mod and edit it in place.
- **Recent**: ships opened or saved before.
- **Game data** card: the game's `ftl.dat` (asked for on the first start), the ship count, and an optional mod (folder, `.ftl` or `.zip`).
- Language and a link to the tour.

## The editor window

```
┌──────────────────────────────────────────────────────────────────────┐
│ ship name · status   [1 Ship][2 Rooms][3 Hull]   undo redo tutorial overview settings  [Save mod] │
├───────────────┬──────────────────────────────────────────────────────┤
│               │ [tool bar: icon name key · icon name key · …]        │
│   inspector   │                    canvas                            │
│               │                                    [Layers][Preview] │
├───────────────┴──────────────────────────────────────────────────────┤
│ game data · ship counts · zoom                                        │
└──────────────────────────────────────────────────────────────────────┘
```

- **Top bar**: the ship's name with an "unsaved changes" mark, the three workspace tabs (keys `1`–`3`), undo and redo, **Tutorial** (starts the tour, see below), the **Overview** button (with a red badge counting the problems, else an amber one counting what to check), settings, and **Save mod**.
- **Inspector** (left): settings of the current workspace and the selection.
- **Tool bar** (top of the canvas): the tools of the current workspace side by side in one low row, each with a small line icon, its name and its current key in a key chip, the chosen one amber. Hovering or focusing a tool shows what it does in a panel below the bar. The Ship workspace has only Select, and still shows it.
- **Canvas**: the ship on the game's grid of 35 px cells. The mouse wheel zooms, dragging with the middle button (or Space held) pans. A solid line marks cell 0 on the left and top (rooms cannot go past it); a dashed red frame marks what the player sees of a player ship in the game. A **Layers** menu shows or hides the hull, floor, cloak, shield, grid, rooms, doors, mounts, gibs and crew; **Preview in hangar** opens the game's hangar screen over the whole window (see below).
- **Crew at the stations**: the crew list is taken member by member in its order (2 human, 1 engi → human, human, engi), and the members man the stations in the order of the ship's systems, each facing its station's direction (a race without its own pictures is drawn as a human). A station nobody is left for shows a faint dashed outline of its cell, an empty seat; the hangar preview shows only the manned stations.
- **Preview in hangar**: a full-window view of the game's hangar (ship select) screen, 1280 × 720 scaled to fit the window (at whole device pixels when that loses little), built from the game's own pictures, a mod's pictures first. The ship sits where the game puts it: its view-limit frame lands on the game's ship area. Drawn on it: the background, the ship (hull, floor, rooms, doors, and the interiors, icons and manned stations of the systems installed at the start, weapons on their mounts), the name box, the systems bar (a box per starting system with its power bars and icon), and the equipment panel with the crew as cards (race picture, race title as the name), the weapons and drones in their slots ("system not installed" when the ship lacks that system) and the augments. The ship, layout, achievements, Start and Advanced Edition boxes are drawn for the look only. Frame titles and button texts are the game's own texts; the game's bitmap fonts are not drawn yet. Nothing in it edits the ship. **Back to editing** (amber, at the top) or Esc closes it; the editor's other keys are off while it is open.
- **Status bar**: which game data and mod are loaded, counts of rooms and doors, zoom.
- **Questions** open in the app's own small dialog, never the system's: a title, the message, Cancel and a button named by what it does. Closing a ship with unsaved changes ("Close ship") and deleting rooms that hold systems ("Delete") lose something, so their button is red and the focus starts on Cancel; giving a game ship a new save name ("Rename") starts on Rename. Esc, Cancel and a click outside answer no; Enter presses the focused button.
- **Crash screen**: should drawing the editor fail, the window shows, in place of the editor, that something went wrong and the error text (selectable, to copy into a report), and logs the error to the console. **Undo and continue** undoes the last step and shows the editor again; **Back to the start screen** closes the ship as the logo does (asking first when there are unsaved changes).

## Tour

**Tutorial** in the top bar starts a step-by-step tour of the editor. The window is dimmed except the part a step is about, which is outlined in amber and followed as the window is resized, scrolled or scaled. A card next to it (inside the window, never over the part) gives the step's title, a short explanation, "Step N of M", and **Skip tour**, **Back** and **Next** (**Done** on the last step). → or Enter goes on, ← back, Esc ends the tour; the focus is on the card, and the editor under it takes no clicks or keys while the tour runs, so nothing in the ship changes.

The steps: the workspace tabs and their keys; the Ship, Rooms and Hull inspectors; the tool bar with the current keys; the canvas (select, move, zoom, pan); the weapon and drone slot bar; Layers and Preview in hangar; Undo and Redo with their keys; the Overview; Settings and Save mod. Every key named is the one currently chosen in Settings. A step about another workspace opens it (the slot bar, for example, opens Ship); a step whose part is not on screen even then shows its card in the middle of the dimmed window. The tour starts with nothing selected and, when it ends, puts back the workspace and the selection it started with.

The first ship opened in a run of the app comes with an offer: "Take a quick tour first?", with what it covers and that the Tutorial button runs it any time. **Start the tour** starts it; **Skip** (or Esc, or a click outside) closes the offer, which comes again in the next run of the app; **Don't offer this again** is remembered. Once the tour has been taken to its end or skipped, it is not offered again either.

## Workspaces

A ship opens in Ship.

### 1 · Ship

Everything about the ship itself. A bar at the bottom of the canvas shows the weapon and drone slots like the game's own bar; their numbers match the mounts on the hull. A click on a filled slot selects it (`Delete` then removes it), a right click removes its item and the later ones move up. A click on an empty slot ("+ weapon", "+ drone", or Enter / Space on it) opens a picker above the bar with the same searchable list as the Weapons or Drones section, details on hover included; the item clicked goes in the first empty slot and the picker closes. Esc or a click outside closes it too. **Preview in hangar** on the canvas shows the ship as the hangar does.

- **Info**: name, class and description as the hangar shows them; under **Save name**, the blueprint name and the file name of the ship.
- **Stats**: hull points (30 for a new ship), the reactor's power, weapon slots (at most 8), drone slots, starting missiles and drone parts. The game has no starting fuel per ship.
- **Crew**: a row for each race with its amount, and "Add race…" (at most 8 crew in total).
- **Weapons**: the ship's weapons in slot order, with the number of weapons and slots. A click on one selects its slot (as a click in the bar does), the arrows move it to an earlier or later slot, the cross removes it; hovering it shows its details and marks its mount on the ship. Below, the game's weapons as a list (picture, name, stats) with search: a click puts one in the next free slot, hovering shows its description and stats.
- **Drones**: the same for drones.
- **Augments** (at most 3): the ship's augments with their details on hover and remove, then the game's augments as a list to add one.

### 2 · Rooms

Rooms, doors, the systems in the rooms and the crew stations.

| Tool    | Key | What it does                                                                                |
| ------- | --- | ------------------------------------------------------------------------------------------- |
| Select  | `Q` | click to select, Shift-click to add, drag to move (snaps to cells), arrows move by one cell |
| Room    | `W` | drag on the grid to draw a room                                                             |
| Door    | `E` | click a wall; a door on the outer wall opens to space and is drawn blue                     |
| Station | `R` | click a cell of a room with a system to put that system's crew station there                |

- With nothing selected the inspector shows **Add a system**: a palette of the game's systems in three groups (core, subsystems, special), coloured by their state (installed at the start, on the ship but bought later, not on the ship), with the room each one is in.
- Drag a system onto a room to place it; drop it outside or back on the palette to remove it. With a room selected, a click on a system puts it in that room.
- A selected room shows a heading with its systems, then **Systems in this room**: a card for each system with its starting level, upgrade limit, "installed at the start", the artillery weapon, the facing of its crew station, the interior picture and Remove. Then **Add a system**, **Position and size**, and Delete.
- A room can hold several systems; only one of them can be installed at the start, the others are bought later and drawn amber.
- A selected door shows its two sides; a selected station the direction the crew member faces. Loose doors are drawn red; an airlock on a room bigger than 2×2 shows a warning, because the game only partly vents such rooms.

### 3 · Hull

| Tool         | Key | What it does                                                                                |
| ------------ | --- | ------------------------------------------------------------------------------------------- |
| Select       | `Q` | click a mount to select it, drag it to move it                                              |
| Move picture | `H` | drag the hull, floor, cloak or shield picture; arrows move by 1 px, Shift + arrows by 10 px |
| Mount        | `T` | click the hull to add a weapon mount (at most 8)                                            |
| Gib          | `G` | select and drag the explosion pieces                                                        |

- Pictures (hull, floor, cloak, shield, ship icon) are chosen from the game or from a PNG file.
- **Weapon mounts** lists the mounts (at most 8) with the weapon drawn on each; a click selects a mount on the ship, the cross removes it. The Mount tool adds mounts.
- A selected mount shows its number (the weapon slot drawn on it), buttons to move it earlier or later, **Rotate** and **Mirror** (also `[` and `]`), the direction the weapon slides out, the explosion piece it flies off with, and whether it moves together with the hull picture.
- The explosion pieces are listed with their pictures; the explosion can be played on the canvas. The preview is approximate (the game's units for speed and turning are not confirmed), so it plays at a chosen speed, ×0.25, ×0.5, ×1 or ×2 next to **Play explosion**, to match the game by eye; the choice is kept until the app is closed.
- A selected gib shows its direction on the canvas with any Hull tool: a translucent amber fan from its centre between its direction min and max (0 up, clockwise), with an arrow along each edge from where its slowest to where its fastest piece would be at the end of the preview at ×1. Dragging the handle at an arrow's tip turns that end of the range in whole degrees (Shift snaps to 15°), one undo step per drag. The fan is hidden during the explosion and in the hangar preview.
- While the Gib tool is chosen the canvas shows only the hull picture and the gibs (with their selection); the rooms, doors, interiors, icons, crew, mounts, shield, floor, cloak, grid and frame come back with any other tool. The Layers menu keeps its choices and says so in a short note.

## Ship overview

The **Overview** button opens a checklist of the whole ship, in sections in the order of the workspaces:

- **Ship**: name, class, description, save name (and the file base name), hull and reactor, crew, weapon and drone slots, weapons and drones the game knows.
- **Rooms**: rooms, no overlaps, room sizes and ids, doors attached to rooms, crew can walk everywhere (doors join every room; airlocks do not count), airlocks on small rooms, every room inside the view-limit frame, crew stations inside their rooms, systems in existing rooms, one system per room at the start, usual system pairs, the core systems (piloting, engines, oxygen, shields), interior pictures that fit.
- **Hull**: hull, floor, shield and cloak pictures, ship icon, explosion pieces with pictures, enough weapon mounts, mounts linked to existing gibs.

An item that is fine is a row with a green check mark and a short value (for example "Rooms: 17" or "30 hull, 8 reactor bars"). An item that needs a look is a card: a red mark for a **problem** (the game will not work or may crash: no rooms, no hull picture, 0 hull points, a cloaking interior picture that does not fit its room) or an amber one for something **to check**, what is wrong, the rooms, doors, mounts or items involved, and **Go there ›**, which closes the dialog, opens the workspace and selects what the item is about. A summary at the top says "Everything looks complete." or counts the problems and the items to check; **Only what needs a look** hides the rows that are fine (remembered until the app is closed). Name, description and ship icon are asked of player ships only, and so is the frame. The Save mod dialog repeats the counts when something needs a look; the ship can still be saved.

## Saving

**Save mod** saves the ship as a single `.ftl` file (ready for Slipstream Mod Manager) or into a mod folder. Closing the ship (the logo in the top bar) with unsaved changes asks first.

## Settings

Two tabs. **General**: interface scale (the whole window zooms, so the canvas stays exact), dark or light theme, language. **Shortcuts**: the keys of the tools, Undo, Redo and Delete selected. Clicking a key waits for the new key or combination (Ctrl, Shift, Alt + key); Esc cancels. Keys are read by their place on the keyboard, so they work with any keyboard layout. A key another action has is offered as a swap; a fixed key is refused. Each key has a reset arrow, and **Reset all to default** puts every key back. The choices are remembered and take effect at once; wherever the interface names a tool key, it shows the current one.

## Keys

The default keys; the ones marked with a star can be changed in Settings › Shortcuts.

| Key                                 | Action                          |
| ----------------------------------- | ------------------------------- |
| `1`–`3`                             | workspaces                      |
| `Q`, `W`, `E`, `R`, `T`, `H`, `G` * | tools                           |
| arrows, Shift + arrows              | move the selection              |
| `D` *, `Delete`, `Backspace`        | delete the selection            |
| `[`, `]`                            | rotate, mirror a mount          |
| `Ctrl+Z` *                          | undo                            |
| `Ctrl+Y` *, `Ctrl+Shift+Z`          | redo                            |
| `Ctrl+S`                            | save                            |
| `Space` held                        | pan                             |
| `Esc`                               | cancel the current drag or tool |

Every change can be undone.
