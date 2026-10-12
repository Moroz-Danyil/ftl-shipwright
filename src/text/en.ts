/**
 * The English texts of the interface. Every user-visible string of the app
 * comes from here; other languages are objects of the same type.
 */
import type { ValidationCode } from "../core";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const list = (ids: number[] | undefined) => (ids && ids.length > 0 ? ids.join(" and ") : "?");

/** What a check refers to: rooms by id, a door by its index. */
interface IssueRefs {
  rooms?: number[];
  door?: number;
}

export const en = {
  languageName: "English",

  app: {
    name: "FTL Shipwright",
    tagline: "Build your own ship for FTL: Faster Than Light",
  },

  notInApp: {
    title: "FTL Shipwright runs as a desktop app",
    body: "This page is the editor's interface. Reading the game's files and saving mods needs the desktop app, so nothing can be loaded in a plain browser.",
  },

  common: {
    cancel: "Cancel",
    close: "Close",
    search: "Search",
  },

  start: {
    newShip: "New ship",
    newShipBody:
      "Start from an empty hull or from a copy of any ship in the game. It is saved as its own ship and never overwrites the original.",
    openShip: "Open a ship",
    openShipBody: "Edit a ship from the game or from a mod in place. Saving writes its own files.",
    needGameData: "Choose the game's ftl.dat first.",
    recent: "Recent",
    recentEmpty: "Ships you open or save will be listed here.",
    recentGame: "Game ship",
    recentModFile: (path: string) => `Mod file · ${path}`,
    recentModFolder: (path: string) => `Mod folder · ${path}`,
    recentWhen: (date: Date) =>
      date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    recentFailed: (name: string, reason: string) => `Could not open ${name}: ${reason}`,
    language: "Language",
    tour: "Take the tour",
    settings: "Settings",
  },

  gameData: {
    title: "Game data",
    archive: "Game archive",
    notChosen: "Not chosen yet",
    askDat:
      "The editor reads the game's ships from its ftl.dat, which is in the folder the game is installed in.",
    found: (n: number) => `Found ${plural(n, "ship", "ships")}`,
    mod: "Mod (optional)",
    modNone: "None",
    modFolder: (path: string) => `Folder · ${path}`,
    modFile: (path: string) => `File · ${path}`,
    chooseDat: "Choose ftl.dat",
    changeDat: "Change ftl.dat",
    addMod: "Add a mod",
    changeMod: "Change mod",
    removeMod: "Remove mod",
    pickModFolder: "Mod folder…",
    pickModFile: "Mod file (.ftl, .zip)…",
    datFilter: "FTL game archive",
    modFilter: "FTL mod",
    loading: "Loading…",
    steps: {
      archive: "Reading the game archive…",
      mod: "Reading the mod…",
      texts: "Reading the game's texts…",
      catalogs: "Reading ships and equipment…",
      animations: "Reading animations…",
    },
    error: (reason: string) => `Could not load the game data: ${reason}`,
    retry: "Try again",
  },

  shipPicker: {
    placeholder: "Name, class or blueprint…",
    noMatch: "No ship matches.",
    playerShips: "Player ships",
    otherShips: "Other ships",
    fromMod: "mod",
  },

  newShip: {
    title: "New ship",
    empty: "Empty hull",
    emptyHint: "No rooms, doors or pictures yet.",
    copy: "Copy of a game ship",
    copyHint: "Rooms, systems, pictures and equipment of the ship you pick.",
    name: "Ship name",
    defaultName: "New ship",
    copyName: (name: string) => `${name} copy`,
    savedAs: (id: string) => `Saved in the mod as ${id}`,
    pickShip: "Pick a ship to copy.",
    create: "Create",
  },

  openShip: {
    title: "Open a ship",
    open: "Open",
    failed: (name: string, reason: string) => `Could not open ${name}: ${reason}`,
  },

  workspaces: {
    layout: { label: "Layout", hint: "Layout — rooms, doors and crew stations" },
    systems: { label: "Systems", hint: "Systems — drag systems onto rooms; amber = bought later" },
    art: { label: "Hull & art", hint: "Hull & art — pictures, weapon mounts and explosion pieces" },
    loadout: { label: "Loadout", hint: "Loadout — weapons and drones fill the slots in order" },
    details: {
      label: "Details",
      hint: "Details — name, class, description, hull, reactor and crew",
    },
  },

  tools: {
    select: "Select",
    room: "Room",
    door: "Door",
    station: "Station",
    movePicture: "Move picture",
    mount: "Mount",
    gib: "Gib",
  },

  topBar: {
    workspaces: "Workspaces",
    closeShip: "Close the ship and go back to the start screen",
    confirmClose: "Close this ship? Its unsaved changes will be lost.",
    unsaved: "unsaved changes",
    saved: "saved",
    undo: "Undo",
    redo: "Redo",
    checks: (n: number) => (n === 0 ? "No checks" : `${n} to check`),
    settings: "Settings",
    saveMod: "Save mod",
  },

  toolRail: {
    label: "Tools",
    tool: (name: string, key: string) => `${name} (${key})`,
  },

  canvas: {
    label: "Ship canvas",
    layers: "Layers",
    preview: "Preview in hangar",
    previewOff: "Back to editing",
    layerNames: {
      hull: "Hull",
      floor: "Floor",
      cloak: "Cloak",
      shield: "Shield",
      grid: "Grid",
      rooms: "Rooms",
      doors: "Doors",
      mounts: "Weapon mounts",
      gibs: "Explosion pieces",
    },
  },

  inspector: {
    label: "Inspector",
    selectedRoom: "Selected room",
    room: (id: number) => `Room ${id}`,
    roomWith: (id: number, systems: string) => `Room ${id} · ${systems}`,
    x: "X",
    y: "Y",
    width: "Width",
    height: "Height",
    inThisRoom: "In this room",
    noSystem: "No system yet",
    boughtLater: (name: string) => `${name} (bought later)`,
    selectedDoor: "Selected door",
    door: (index: number) => `Door ${index}`,
    wall: "Wall",
    verticalWall: "Vertical",
    horizontalWall: "Horizontal",
    sides: "Connects",
    side: (id: number) => `Room ${id}`,
    space: "Space",
    airlock: "Airlock: this door opens to space.",
    loose: "This door touches no room.",
    largeAirlock:
      "This airlock is on a room bigger than 2×2; the game only partly vents such rooms.",
    nothingSelected: "Nothing selected",
    nothingSelectedHint: "Click a room or a door with the Select tool (V) to see its values.",
    toolHelp: [
      { title: "Select tool (V)", body: "Click a room or a door to select it. Esc clears." },
      {
        title: "Room tool (R)",
        body: "Drag on the grid to draw a room. Rooms snap to cells and never cross the solid edge at 0.",
      },
      { title: "Door tool (D)", body: "Click a wall. Doors to space turn blue (airlocks)." },
    ],
    systems: {
      eyebrow: "Drag a system onto a room",
      title: "Systems",
      body: "Place the game's systems in rooms, choose their starting and maximum levels and which ones are bought later.",
    },
    art: {
      eyebrow: "Pictures, weapon mounts and explosion pieces",
      title: "Hull & art",
      body: "Choose and place the hull, floor, cloak and shield pictures, add weapon mounts and arrange the explosion pieces.",
    },
    loadout: {
      eyebrow: "Pick from the game's weapons, drones and augments",
      title: "Loadout",
      body: "Fill the weapon and drone slots, choose augments and set the starting missiles and drone parts.",
    },
    details: {
      eyebrow: "What the hangar shows",
      title: "Details",
      body: "Name, class and description, the save name, hull, reactor and the starting crew.",
    },
    comingSoon: "The tools of this workspace are not available yet.",
  },

  status: {
    game: (file: string, ships: number) => `Game data: ${file} · ${plural(ships, "ship", "ships")}`,
    noMod: "no mod",
    mod: (name: string) => `mod ${name}`,
    counts: (rooms: number, doors: number, zoom: number) =>
      `${plural(rooms, "room", "rooms")} · ${plural(doors, "door", "doors")} · zoom ${zoom}%`,
  },

  checks: {
    title: "Checks",
    empty: "Nothing to look at.",
    messages: {
      "room-overlap": (i: IssueRefs) => `Rooms ${list(i.rooms)} overlap.`,
      "room-ids": (i: IssueRefs) =>
        `Room ${list(i.rooms)} is out of order; room ids must be 0, 1, 2… in order.`,
      "room-size": (i: IssueRefs) => `Room ${list(i.rooms)} is smaller than one cell.`,
      "door-no-room": (i: IssueRefs) => `Door ${i.door ?? "?"} touches no room.`,
      "door-rooms-mismatch": (i: IssueRefs) =>
        `Door ${i.door ?? "?"} names other rooms than the ones beside it.`,
      "airlock-large-room": (i: IssueRefs) =>
        `Door ${i.door ?? "?"} is an airlock on room ${list(i.rooms)}, which is bigger than 2×2; the game only partly vents it.`,
      "station-outside-room": (i: IssueRefs) =>
        `A crew station lies outside room ${list(i.rooms)}.`,
      "system-unknown-room": (i: IssueRefs) =>
        `A system is in room ${list(i.rooms)}, which does not exist.`,
    } satisfies Record<ValidationCode, (issue: IssueRefs) => string>,
  },

  save: {
    title: "Save mod",
    ftl: ".ftl file",
    ftlHint: "One file, ready for Slipstream Mod Manager.",
    folder: "Mod folder",
    folderHint:
      "Writes the files into a folder. A mod already in it keeps its other ships and files.",
    checksWarning: (n: number) =>
      `${plural(n, "thing", "things")} to check (see Checks). The ship can still be saved.`,
    saving: "Saving…",
    savedTo: (path: string) => `Saved to ${path}`,
    failed: (reason: string) => `Could not save: ${reason}`,
    needHull: "The ship has no hull picture yet, so it cannot be saved as a mod.",
    ftlFilter: "FTL mod",
  },

  errors: {
    unknown: "unknown error",
    shipNotFound: "the ship's blueprint or layout files are missing",
  },
};

export type Texts = typeof en;
