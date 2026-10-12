# The interface

How FTL Shipwright looks and behaves. The editor is built around **workspaces**: building a ship is split into five steps, and each step shows only the tools and settings it needs.

## Look

- Dark theme: graphite background, one amber accent for selection and the main action; airlock doors blue, problems red, things bought later amber.
- Typefaces: IBM Plex Sans for text, IBM Plex Mono for numbers, ids and keys.
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
│ ship name · status   [1 Layout][2 Systems][3 Hull & art][4 Loadout][5 Details]   undo redo  checks  settings  [Save mod] │
├────┬─────────────────────────────────────────────────┬───────────────┤
│tool│                                                 │               │
│rail│                    canvas                       │   inspector   │
│    │                                                 │               │
├────┴─────────────────────────────────────────────────┴───────────────┤
│ game data · ship counts · zoom                                        │
└──────────────────────────────────────────────────────────────────────┘
```

- **Top bar**: the ship's name with an "unsaved changes" mark, the five workspace tabs (keys `1`–`5`), undo and redo, the **checks** button with the number of things to look at, settings, and **Save mod**.
- **Tool rail**: the tools of the current workspace, each with its key.
- **Canvas**: the ship on the game's grid of 35 px cells. The mouse wheel zooms, dragging with the middle button (or Space held) pans. A solid line marks cell 0 on the left and top (rooms cannot go past it); a dashed red frame marks what the player sees of a player ship in the game. A **Layers** menu shows or hides the hull, floor, cloak, shield, grid, rooms, doors, mounts, gibs and crew; **Preview in hangar** shows the ship as the game's hangar does.
- **Inspector**: settings of the current workspace and the selection.
- **Status bar**: which game data and mod are loaded, counts of rooms and doors, zoom.

## Workspaces

### 1 · Layout

Rooms, doors and crew stations.

| Tool    | Key | What it does                                                                                |
| ------- | --- | ------------------------------------------------------------------------------------------- |
| Select  | `V` | click to select, Shift-click to add, drag to move (snaps to cells), arrows move by one cell |
| Room    | `R` | drag on the grid to draw a room                                                             |
| Door    | `D` | click a wall; a door on the outer wall opens to space and is drawn blue                     |
| Station | `T` | click a cell of a room with a system to put that system's crew station there                |

Inspector: the selected room's position and size, the systems in it (changed in Systems), its interior picture; for a door, its two sides; for a station, the direction the crew member faces. Loose doors are drawn red; an airlock on a room bigger than 2×2 shows a warning, because the game only partly vents such rooms.

### 2 · Systems

- A palette of the game's systems in three groups (core, subsystems, special) shows which are placed.
- Drag a system onto a room to place it; drop it outside to remove it. Rooms show a label for each system they hold.
- A room can hold several systems; only one of them can be installed at the start, the others are bought later and drawn amber.
- Inspector for the selected room: each system's starting and maximum level, "installed at the start", the interior picture.

### 3 · Hull & art

| Tool         | Key | What it does                                                                                |
| ------------ | --- | ------------------------------------------------------------------------------------------- |
| Select       | `V` |                                                                                             |
| Move picture | `H` | drag the hull, floor, cloak or shield picture; arrows move by 1 px, Shift + arrows by 10 px |
| Mount        | `M` | click the hull to add a weapon mount (at most 8)                                            |
| Gib          | `G` | select and drag the explosion pieces                                                        |

- Pictures (hull, floor, cloak, shield, ship icon) are chosen from the game or from a PNG file.
- A selected mount shows its number (the weapon slot drawn on it), buttons to move it earlier or later, **Rotate** and **Mirror** (also `[` and `]`), the direction the weapon slides out, the explosion piece it flies off with, and whether it moves together with the hull picture.
- The explosion can be played on the canvas.

### 4 · Loadout

- A bar at the bottom of the canvas shows the weapon and drone slots like the game's own bar; their numbers match the mounts on the hull.
- The inspector lists the game's weapons, drones and augments with search and cards (picture, description, stats).
- Weapon slots (at most 8), drone slots, augments (at most 3), starting missiles and drone parts.

### 5 · Details

Name, class and description as the hangar shows them, the save name (the file names of the ship), hull (30 for a new ship), reactor, and the starting crew (at most 8 in total).

## Checks

The checks button opens a list of everything about the ship that is unfinished or may not work in the game, sorted into problems, things to look at and tips. Clicking an item opens the workspace and selection it is about. Saving shows the same list first when something is wrong; the ship can still be saved.

## Saving

**Save mod** saves the ship as a single `.ftl` file (ready for Slipstream Mod Manager) or into a mod folder. Closing the window with unsaved changes asks first.

## Settings

Interface scale, language and keyboard shortcuts (every tool key can be changed).

## Keys

| Key                                | Action                          |
| ---------------------------------- | ------------------------------- |
| `1`–`5`                            | workspaces                      |
| `V`, `R`, `D`, `T`, `H`, `M`, `G`  | tools                           |
| arrows, Shift + arrows             | move the selection              |
| `Delete`, `Backspace`              | delete the selection            |
| `[`, `]`                           | rotate, mirror a mount          |
| `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y` | undo, redo                      |
| `Ctrl+S`                           | save                            |
| `Esc`                              | cancel the current drag or tool |

Every change can be undone.
