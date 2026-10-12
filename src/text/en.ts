/**
 * The English texts of the interface. Every user-visible string of the app
 * comes from here; other languages are objects of the same type.
 */
import type { CheckCode } from "../app/checks";

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
      stations: "Crew stations",
      mounts: "Weapon mounts",
      gibs: "Explosion pieces",
    },
  },

  layout: {
    problems: {
      belowZero: "Rooms cannot go left of or above cell 0.",
      overlap: "Rooms cannot overlap other rooms.",
      tooSmall: "A room is at least 1 × 1 cell.",
    },
    confirmDelete: (systems: number) =>
      `The rooms you are deleting hold ${plural(systems, "system", "systems")}. Delete the rooms together with their systems?`,
    noStationSystem: "This room has no system with a crew station.",
  },

  systems: {
    /** Names for systems the game has no title for. */
    fallbackNames: { artillery: "Artillery" } as Record<string, string>,
    groups: { core: "Core", subsystems: "Subsystems", special: "Special" },
    palette: "Systems",
    inRoom: (id: number) => `room ${id}`,
    help: "Drag a system onto a room, or select a room and click a system. Drop a system on empty space or back on this list to remove it.",
    selectRoomFirst: "Select a room first, then click a system to put it there.",
    problems: {
      sameRoom: "The system is already in that room.",
      noRoom: "There is no room there.",
    },
    selectedRoom: "Selected room",
    roomTitle: (id: number) => `Room ${id}`,
    empty: "No system in this room yet.",
    level: "Starting level",
    levelOf: (level: number, max: number) => `${level} / ${max}`,
    minus: "−",
    plus: "+",
    lower: (what: string) => `Lower ${what}`,
    higher: (what: string) => `Raise ${what}`,
    installed: "Installed at the start",
    upgradeLimit: "Upgrade limit",
    remove: "Remove",
    removeNamed: (name: string) => `Remove ${name}`,
    interior: "Interior picture",
    interiorNone: "None",
    interiorAll: "Show all interior pictures",
    interiorSize: (w: number, h: number) => `${w} × ${h} px`,
    interiorMismatch: (w: number, h: number, rw: number, rh: number) =>
      `The picture is ${w} × ${h} px but the room is ${rw} × ${rh} px.`,
    cloakMismatch:
      "A cloaking picture that does not fit its room made the game crash in testing. Pick one of the room's size.",
    noInteriors: "The game has no interior picture for this system.",
    artilleryWeapon: "Weapon",
    unusualMix:
      "The game's own ships never put these systems in one room; the game may not handle it.",
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
    roomId: "Id",
    doorsOnWalls: (n: number) =>
      n === 0 ? "No doors on its walls" : `${plural(n, "door", "doors")} on its walls`,
    changeInSystems: "Change in Systems (2)",
    crewCell: (name: string, cell: number) => `${name}: crew cell ${cell}, kept as it is`,
    delete: "Delete",
    position: "Position",
    selectedStation: "Selected crew station",
    station: (system: string) => `${system} station`,
    stationCell: "Cell",
    facing: "Facing",
    directions: { up: "Up", down: "Down", left: "Left", right: "Right" },
    several: "Selected",
    severalTitle: (n: number) => `${n} things`,
    severalParts: (rooms: number, doors: number, stations: number) =>
      [
        rooms > 0 ? plural(rooms, "room", "rooms") : "",
        doors > 0 ? plural(doors, "door", "doors") : "",
        stations > 0 ? plural(stations, "station", "stations") : "",
      ]
        .filter((part) => part !== "")
        .join(", "),
    stationFor: "The Station tool places the station of",
    stationChoice: (system: string, room: number) => `${system} · room ${room}`,
    noStationSystems:
      "No system on this ship has a crew station yet. Place pilot, doors, sensors, weapons, shields, engines or hacking in Systems first.",
    toolHelp: {
      select: {
        title: "Select tool (V)",
        body: "Click to select, Shift+click to add or remove, drag on empty space to select with a box. Drag selected rooms to move them; arrows move them by one cell; Delete removes the selection.",
      },
      room: {
        title: "Room tool (R)",
        body: "Drag on the grid to draw a room. Rooms snap to cells and never cross the solid edge at 0 or overlap. Right-click or Esc cancels.",
      },
      door: {
        title: "Door tool (D)",
        body: "Click a wall next to a room. Doors to space are blue (airlocks).",
      },
      station: {
        title: "Station tool (T)",
        body: "Click a cell of a room with a system to put that system's crew station there. Select a station to turn it.",
      },
    },
    systems: {
      eyebrow: "Drag a system onto a room",
      title: "Systems",
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
      "several-installed": (i: IssueRefs) =>
        `Room ${list(i.rooms)} has more than one system installed at the start; only one of them can be.`,
      "unusual-mix": (i: IssueRefs) =>
        `Room ${list(i.rooms)} holds systems the game never puts together; the game may not handle it.`,
      "cloak-interior-size": (i: IssueRefs) =>
        `The cloaking interior picture of room ${list(i.rooms)} does not match the room size; such a picture made the game crash.`,
    } satisfies Record<CheckCode, (issue: IssueRefs) => string>,
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
