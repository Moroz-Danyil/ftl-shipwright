# The interface

How FTL Shipwright looks and behaves. The editor is built around **workspaces**: building a ship is split into four steps, in the order a ship is made, and each step shows only the tools and settings it needs.

## Look

- Dark theme: graphite background, one amber accent for selection and the main action; airlock doors blue, problems red, things bought later amber.
- A light theme with the same layout: soft greys rather than white, the same amber accent darkened for contrast.
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
│ ship name · status   [1 Rooms][2 Hull][3 Loadout][4 Hangar]   undo redo  checks  settings  [Save mod] │
├───────────────┬─────────────────────────────────────────────────┬────┤
│               │                                                 │tool│
│   inspector   │                    canvas                       │rail│
│               │                                                 │    │
├───────────────┴─────────────────────────────────────────────────┴────┤
│ game data · ship counts · zoom                                        │
└──────────────────────────────────────────────────────────────────────┘
```

- **Top bar**: the ship's name with an "unsaved changes" mark, the four workspace tabs (keys `1`–`4`), undo and redo, the **checks** button with the number of things to look at, settings, and **Save mod**.
- **Inspector** (left): settings of the current workspace and the selection.
- **Tool rail** (right): the tools of the current workspace, each with its key.
- **Canvas**: the ship on the game's grid of 35 px cells. The mouse wheel zooms, dragging with the middle button (or Space held) pans. A solid line marks cell 0 on the left and top (rooms cannot go past it); a dashed red frame marks what the player sees of a player ship in the game. A **Layers** menu shows or hides the hull, floor, cloak, shield, grid, rooms, doors, mounts, gibs and crew; **Preview in hangar** shows the ship as the game's hangar does.
- **Status bar**: which game data and mod are loaded, counts of rooms and doors, zoom.

## Workspaces

### 1 · Rooms

Rooms, doors, the systems in the rooms and the crew stations.

| Tool    | Key | What it does                                                                                |
| ------- | --- | ------------------------------------------------------------------------------------------- |
| Select  | `V` | click to select, Shift-click to add, drag to move (snaps to cells), arrows move by one cell |
| Room    | `R` | drag on the grid to draw a room                                                             |
| Door    | `D` | click a wall; a door on the outer wall opens to space and is drawn blue                     |
| Station | `T` | click a cell of a room with a system to put that system's crew station there                |

- With nothing selected the inspector shows **Add a system**: a palette of the game's systems in three groups (core, subsystems, special), coloured by their state (installed at the start, on the ship but bought later, not on the ship), with the room each one is in.
- Drag a system onto a room to place it; drop it outside or back on the palette to remove it. With a room selected, a click on a system puts it in that room.
- A selected room shows a heading with its systems, then **Systems in this room**: a card for each system with its starting level, upgrade limit, "installed at the start", the artillery weapon, the facing of its crew station, the interior picture and Remove. Then **Add a system**, **Position and size**, and Delete.
- A room can hold several systems; only one of them can be installed at the start, the others are bought later and drawn amber.
- A selected door shows its two sides; a selected station the direction the crew member faces. Loose doors are drawn red; an airlock on a room bigger than 2×2 shows a warning, because the game only partly vents such rooms.

### 2 · Hull

| Tool         | Key | What it does                                                                                |
| ------------ | --- | ------------------------------------------------------------------------------------------- |
| Select       | `V` | click a mount to select it, drag it to move it                                              |
| Move picture | `H` | drag the hull, floor, cloak or shield picture; arrows move by 1 px, Shift + arrows by 10 px |
| Mount        | `M` | click the hull to add a weapon mount (at most 8)                                            |
| Gib          | `G` | select and drag the explosion pieces                                                        |

- Pictures (hull, floor, cloak, shield, ship icon) are chosen from the game or from a PNG file.
- **Weapon mounts** lists the mounts (at most 8) with the weapon drawn on each; a click selects a mount on the ship, the cross removes it. The Mount tool adds mounts.
- A selected mount shows its number (the weapon slot drawn on it), buttons to move it earlier or later, **Rotate** and **Mirror** (also `[` and `]`), the direction the weapon slides out, the explosion piece it flies off with, and whether it moves together with the hull picture.
- The explosion pieces are listed with their pictures; the explosion can be played on the canvas.

### 3 · Loadout

Everything the ship starts with.

- A bar at the bottom of the canvas shows the weapon and drone slots like the game's own bar; their numbers match the mounts on the hull. A selected slot comes first in the inspector, with buttons to move it earlier or later and Remove.
- **Hull and reactor**: hull points (30 for a new ship) and the reactor's power.
- **Slots and ammunition**: weapon slots (at most 8), drone slots, starting missiles and drone parts.
- **Crew**: a row for each race with its amount, and "Add race…" (at most 8 crew in total).
- **Augments** (at most 3).
- **Add items**: the game's weapons, drones and augments with search and cards (picture, description, stats).

### 4 · Hangar

What the hangar shows and how the ship is saved: name, class and description as the hangar shows them, and the save name (the file names of the ship). **Preview in hangar** on the canvas shows the ship as the hangar does.

## Checks

The checks button opens a list of everything about the ship that is unfinished or may not work in the game, sorted into problems, things to look at and tips. Clicking an item opens the workspace and selection it is about. Saving shows the same list first when something is wrong; the ship can still be saved.

## Saving

**Save mod** saves the ship as a single `.ftl` file (ready for Slipstream Mod Manager) or into a mod folder. Closing the window with unsaved changes asks first.

## Settings

Interface scale (the whole window zooms, so the canvas stays exact), dark or light theme, language, and keyboard shortcuts (every tool key can be changed). The choices are remembered.

## Keys

| Key                                | Action                          |
| ---------------------------------- | ------------------------------- |
| `1`–`4`                            | workspaces                      |
| `V`, `R`, `D`, `T`, `H`, `M`, `G`  | tools                           |
| arrows, Shift + arrows             | move the selection              |
| `Delete`, `Backspace`              | delete the selection            |
| `[`, `]`                           | rotate, mirror a mount          |
| `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+Y` | undo, redo                      |
| `Ctrl+S`                           | save                            |
| `Esc`                              | cancel the current drag or tool |

Every change can be undone.
