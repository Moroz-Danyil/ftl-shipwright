/**
 * The English texts of the interface. Every user-visible string of the app
 * comes from here; other languages are objects of the same type.
 */
import type { CheckCode } from "../app/checks";
import type { OverviewItemId } from "../app/overview";
import type { RebindableCommand } from "../app/keys";
import type { TourKeys, TourStepId } from "../app/tour";
import type { ToolId, WorkspaceId } from "../app/workspaces";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const list = (ids: number[] | undefined) =>
  !ids || ids.length === 0
    ? "?"
    : ids.length === 1
      ? String(ids[0])
      : `${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]}`;
/** "room 3" or "rooms 3 and 5". */
const rooms = (ids: number[] | undefined) =>
  `${ids && ids.length > 1 ? "rooms" : "room"} ${list(ids)}`;

/** The texts of an overview item; some have more (the value it shows while ok). */
interface ItemTexts {
  title: string;
  /** What is wrong and where to fix it (empty for items that are always ok). */
  explain: string;
  [more: string]: unknown;
}

/** What a check refers to: rooms by id, a door by its index. */
interface IssueRefs {
  rooms?: number[];
  door?: number;
  mount?: number;
  gib?: number;
  item?: string;
  /** The name of the system involved. */
  systemName?: string;
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
    /** A name with its key, e.g. `Undo (Ctrl+Z)`. */
    withKey: (name: string, key: string) => `${name} (${key})`,
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
    create: "Create",
  },

  openShip: {
    title: "Open a ship",
    open: "Open",
    failed: (name: string, reason: string) => `Could not open ${name}: ${reason}`,
  },

  workspaces: {
    ship: { label: "Ship" },
    rooms: { label: "Rooms" },
    hull: { label: "Hull" },
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
    confirmClose: {
      title: "Close this ship?",
      message: "Its unsaved changes will be lost.",
      confirm: "Close ship",
    },
    unsaved: "unsaved changes",
    saved: "saved",
    undo: "Undo",
    redo: "Redo",
    settings: "Settings",
    saveMod: "Save mod",
    tutorial: "Tutorial",
    tutorialHint: "A step-by-step tour of the editor",
  },

  /** The guided tour of the editor. */
  tour: {
    offer: {
      title: "Take a quick tour first?",
      message:
        "A short walk through the editor: the workspaces, the inspector, the tools and canvas, the slot bar, the overview and saving. You can take it any time later with the Tutorial button in the top bar.",
      start: "Start the tour",
      skip: "Skip",
      never: "Don't offer this again",
    },
    label: "Editor tour",
    stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
    back: "Back",
    next: "Next",
    skip: "Skip tour",
    done: "Done",
    keysHint: "→ or Enter: next · ←: back · Esc: end the tour",
    steps: {
      workspaces: {
        title: "Three workspaces",
        body: (k: TourKeys) =>
          `A ship is made in three steps, one workspace each: Ship for its name, numbers and equipment, Rooms for the rooms, doors and systems, and Hull for the pictures, weapon mounts and explosion. Switch with these tabs or the keys ${k.workspace.ship}, ${k.workspace.rooms} and ${k.workspace.hull}.`,
      },
      shipInspector: {
        title: "Ship: the ship itself",
        body: () =>
          "The inspector on the left shows the ship's info and save name, its stats, the crew, and its weapons, drones and augments. Hover a field to see what it means for the game.",
      },
      roomsInspector: {
        title: "Rooms: systems and rooms",
        body: () =>
          "With nothing selected, Rooms lists the game's systems as tiles: green when installed at the start, amber when bought later, red when not on the ship. Drag a tile onto a room to put the system there. Click a room on the canvas to edit everything about it: its systems, crew station, position and size.",
      },
      hullInspector: {
        title: "Hull: pictures, mounts and explosion",
        body: () =>
          "Hull holds the ship's pictures (hull, floor, cloak, shield and the ship icon, from the game or a PNG file), the weapon mounts and the explosion pieces the ship breaks into.",
      },
      tools: {
        title: "Tools",
        body: (k: TourKeys) =>
          `The tools of the workspace, each with its key. Rooms: Select ${k.tool.select}, Room ${k.tool.room}, Door ${k.tool.door}, Station ${k.tool.station}. Hull: Select ${k.tool.select}, Move picture ${k.tool.movePicture}, Mount ${k.tool.mount}, Gib ${k.tool.gib}. Hover a tool to see what it does.`,
      },
      canvas: {
        title: "The canvas",
        body: (k: TourKeys) =>
          `The ship on the game's grid. Click to select, drag to move. The mouse wheel zooms; drag with the middle button, or hold ${k.pan.join(" or ")} and drag, to pan.`,
      },
      slots: {
        title: "Weapon and drone slots",
        body: (k: TourKeys) =>
          `In Ship, the bar under the ship shows the weapon and drone slots as the game does. Click "+ weapon" or "+ drone" to pick one; right-click a slot to remove its item, or select it and press ${k.delete[0] ?? ""}.`,
      },
      view: {
        title: "Layers and preview",
        body: () =>
          "Layers shows or hides parts of the drawing: pictures, grid, rooms, doors, crew, mounts and more. Preview in hangar shows the ship as the game's hangar screen does; Esc goes back to editing.",
      },
      undo: {
        title: "Undo and redo",
        body: (k: TourKeys) =>
          `Every change can be undone. Undo: ${k.undo.join(" or ")}. Redo: ${k.redo.join(" or ")}.`,
      },
      overview: {
        title: "Overview",
        body: () =>
          "A checklist of the whole ship. The badge counts what needs a look: red for problems the game may not handle, amber for things to check. Go there opens the right workspace and selects what an item is about.",
      },
      settings: {
        title: "Settings and saving",
        body: () =>
          "Settings changes the interface scale, the light or dark theme and the keyboard shortcuts. Save mod writes the ship as an .ftl file for Slipstream Mod Manager or into a mod folder.",
      },
    } satisfies Record<TourStepId, { title: string; body: (keys: TourKeys) => string }>,
  },

  /** Shown in place of the editor when drawing it fails. */
  crash: {
    title: "Something went wrong",
    message:
      "The editor stopped on an error. Your ship is still open as it was: undo the last step to carry on editing, or go back to the start screen.",
    errorLabel: "The error",
    undoAndContinue: "Undo and continue",
    backToStart: "Back to the start screen",
  },

  /**
   * What each tool of each workspace does, shown under the tool bar and in the inspector.
   * The title is shown with the tool's current key (`common.withKey`).
   */
  toolHelp: {
    ship: {
      select: {
        title: "Select tool",
        body: "Click a slot in the bar under the ship to select it; Delete removes its weapon or drone. Hover a slot to see its mount on the hull. Preview in hangar shows the ship as the game's hangar does.",
      },
    },
    rooms: {
      select: {
        title: "Select tool",
        body: "Click to select, Shift+click to add or remove, drag on empty space to select with a box. Drag selected rooms to move them; arrows move them by one cell; Delete removes the selection.",
      },
      room: {
        title: "Room tool",
        body: "Drag on the grid to draw a room. Rooms snap to cells and never cross the solid edge at 0 or overlap. Right-click or Esc cancels.",
      },
      door: {
        title: "Door tool",
        body: "Click a wall next to a room. Doors to space are blue (airlocks).",
      },
      station: {
        title: "Station tool",
        body: "Click a cell of a room with a system to put that system's crew station there. Turn a station in its system's card, or select the station.",
      },
    },
    hull: {
      select: {
        title: "Select tool",
        body: "Click a mount to select it, drag it to move it. Arrows move the selection by 1 px, Shift + arrows by 10 px.",
      },
      movePicture: {
        title: "Move picture tool",
        body: "Drag the hull, floor, cloak or shield picture. Arrows move the picture by 1 px, Shift + arrows by 10 px.",
      },
      mount: {
        title: "Mount tool",
        body: "Click the hull picture to add a weapon mount (at most 8); drag a mount to move it. [ rotates and ] mirrors the selected mount.",
      },
      gib: {
        title: "Gib tool",
        body: "Click an explosion piece to select it, drag it to move it.",
      },
    },
  } satisfies Record<WorkspaceId, Partial<Record<ToolId, { title: string; body: string }>>>,

  toolBar: {
    label: "Tools",
  },

  canvas: {
    label: "Ship canvas",
    layers: "Layers",
    preview: "Preview in hangar",
    previewOff: "Back to editing",
    previewOffKey: "Esc",
    hangarMoreCrew: (n: number) => `+${n} more`,
    gibToolLayers: "The Gib tool shows only the hull and the gibs while it is chosen.",
    layerNames: {
      hull: "Hull",
      floor: "Floor",
      cloak: "Cloak",
      shield: "Shield",
      grid: "Grid",
      rooms: "Rooms",
      doors: "Doors",
      stations: "Crew",
      roomNumbers: "Room numbers",
      interiors: "Room interiors",
      systemIcons: "System icons",
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
    confirmDelete: {
      title: "Delete rooms with systems?",
      message: (systems: number) =>
        `The rooms you are deleting hold ${plural(systems, "system", "systems")}. The systems are deleted together with the rooms.`,
      confirm: "Delete",
    },
    noStationSystem: "This room has no system with a crew station.",
  },

  systems: {
    /** Names for systems the game has no title for. */
    fallbackNames: { artillery: "Artillery" } as Record<string, string>,
    groups: { core: "Core", subsystems: "Subsystems", special: "Special" },
    palette: "Systems",
    roomTag: (id: number) => `#${id}`,
    nameInRoom: (name: string, room: number) => `${name} (room ${room})`,
    startingPower: "Starting power",
    maxPower: "Max power",
    states: {
      start: "Installed at the start",
      later: "On the ship, bought later",
      missing: "Not on the ship",
    },
    notAtStart: "not at start",
    legend: "What the colours mean",
    help: "Drag a system onto a room, or select a room and click a system. Drop a system on empty space or back on this list to remove it.",
    helpRoom:
      "Click a system to put it in this room, or drag it onto any room. Drop a system on empty space or back on this list to remove it.",
    selectRoomFirst: "Select a room first, then click a system to put it there.",
    problems: {
      sameRoom: "The system is already in that room.",
      noRoom: "There is no room there.",
    },
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
    station: (cell: number) => `Crew station · cell ${cell}`,
    noStation: (key: string) => `No crew station yet; place it with the Station tool (${key}).`,
    unusualMix:
      "The game's own ships never put these systems in one room; the game may not handle it.",
  },

  art: {
    pngFilter: "PNG picture",
    fileFailed: (reason: string) => `Could not read the picture: ${reason}`,
    notPng: "That file is not a PNG picture.",
    slots: {
      hull: "Hull",
      floor: "Floor",
      cloak: "Cloak",
      shield: "Shield",
      miniship: "Ship icon",
    },
    noPicture: "No picture",
    change: "Change",
    remove: "Remove",
    changeNamed: (what: string) => `Change ${what}`,
    removeNamed: (what: string) => `Remove ${what}`,
    pictureOf: (name: string) => `Picture: ${name}`,
    choose: (what: string) => `Choose a picture: ${what}`,
    gibName: (n: number) => `Gib ${n}`,
    newGib: "New gib",
    fromFile: "From a PNG file…",
    searchPlaceholder: "File name…",
    noMatches: "No picture matches.",
    pictureSize: (w: number, h: number) => `${w} × ${h} px`,
    moveOptions: "Move picture",
    moveWhich: "Picture to move",
    moveAuto: "The one under the pointer",
    keepMounts: "Keep mounts in place on the ship",
    mountProblems: {
      full: "A ship has at most 8 weapon mounts.",
      outside: "Put mounts on the hull picture.",
    },
    selectedMount: "Selected weapon mount",
    mount: (n: number) => `Mount ${n}`,
    mountEmpty: "No weapon",
    selectMount: (n: number) => `Select mount ${n} on the ship`,
    weaponHere: (name: string) => `Weapon ${name} is drawn here.`,
    noWeapon: "No weapon is equipped on this mount.",
    earlier: "Earlier",
    later: "Later",
    rotate: "Rotate",
    mirror: "Mirror",
    slide: "Slides out",
    slides: { up: "Up", down: "Down", left: "Left", right: "Right", no: "None" } as Record<
      string,
      string
    >,
    gib: "Flies off with",
    gibNone: "No gib",
    x: "X",
    y: "Y",
    delete: "Delete",
    selectedGib: "Selected explosion piece",
    velocity: "Velocity",
    direction: "Direction (degrees)",
    angular: "Turning",
    min: "Min",
    max: "Max",
    addGib: "Add gib…",
    selectGib: (n: number) => `Select gib ${n} on the ship`,
    playExplosion: "Play explosion",
    explosionApprox:
      "The explosion preview is approximate; the game's units for speed and turning are not confirmed yet. Pick the speed that matches the game.",
    explosionSpeed: "Explosion speed",
    speed: (speed: number) => `×${speed}`,
    speedNamed: (speed: number) => `Play the explosion at ×${speed}`,
    several: (mounts: number, gibs: number) =>
      [
        mounts > 0 ? plural(mounts, "mount", "mounts") : "",
        gibs > 0 ? plural(gibs, "gib", "gibs") : "",
      ]
        .filter((part) => part !== "")
        .join(", "),
  },

  loadout: {
    searchPlaceholder: {
      weapon: "Laser, ion, missile…",
      drone: "Combat, defense…",
      augment: "Scrap, reloader…",
    },
    bar: "Weapon and drone slots",
    weaponsCount: (n: number, slots: number) => `Weapons ${n} / ${slots}`,
    dronesCount: (n: number, slots: number) => `Drones ${n} / ${slots}`,
    emptySlot: { weapon: "+ weapon", drone: "+ drone" },
    slotLabel: (n: number, name: string) => `Slot ${n}: ${name}`,
    emptySlotLabel: (n: number) => `Slot ${n}: empty`,
    slotHint: "Click to select. Right click removes it.",
    pickHint: {
      weapon: "Choose a weapon for the next free slot",
      drone: "Choose a drone for the next free slot",
    },
    pickTitle: {
      weapon: (n: number) => `Weapon for slot ${n}`,
      drone: (n: number) => `Drone for slot ${n}`,
    },
    full: {
      weapon: "Every weapon slot is taken. Add a slot or remove a weapon first.",
      drone: "Every drone slot is taken. Add a slot or remove a drone first.",
    },
    augmentProblems: {
      full: "A ship has at most 3 augments.",
      duplicate: "This augment does not stack; the ship has it already.",
    },
    weaponSlots: "Weapon slots",
    droneSlots: "Drone slots",
    missiles: "Starting missiles",
    droneParts: "Starting drone parts",
    equipped: {
      weapon: "The ship's weapons",
      drone: "The ship's drones",
      augment: "The ship's augments",
    },
    catalog: {
      weapon: "The game's weapons",
      drone: "The game's drones",
      augment: "The game's augments",
    },
    noItems: { weapon: "No weapons yet.", drone: "No drones yet." },
    noAugments: "No augments yet.",
    removeNamed: (name: string) => `Remove ${name}`,
    earlierNamed: (name: string) => `Move ${name} to an earlier slot`,
    laterNamed: (name: string) => `Move ${name} to a later slot`,
    noMatches: "Nothing matches.",
    unknownItem: (name: string) => `${name} (not in the game)`,
    stats: {
      damage: (n: number) => `${n} damage`,
      shots: (n: number) => `${n} ${n === 1 ? "shot" : "shots"}`,
      power: (n: number) => `${n} power`,
      cost: (n: number) => `${n} scrap`,
      missiles: (n: number) => `uses ${n} ${n === 1 ? "missile" : "missiles"}`,
      stackable: "stacks",
    },
    details: {
      damage: "Damage",
      shots: "Shots",
      sp: "Shield piercing",
      fireChance: "Fire chance",
      breachChance: "Breach chance",
      stunChance: "Stun chance",
      ion: "Ion damage",
      persDamage: "Crew damage",
      sysDamage: "System damage",
      cooldown: "Charge time",
      power: "Power",
      missiles: "Missiles per shot",
      cost: "Cost",
      type: "Type",
      value: "Value",
    },
    units: {
      percent: (tens: number) => `${tens * 10} %`,
      seconds: (n: number) => `${n} s`,
      scrap: (n: number) => `${n} scrap`,
    },
    hints: {
      weapon: "Click a weapon to put it in the next free slot. Hover it for its details.",
      drone: "Click a drone to put it in the next free slot. Hover it for its details.",
      augment: "Click an augment to add it. Hover it for its details.",
    },
    hull: "Hull",
    reactor: "Reactor",
  },

  hangar: {
    name: "Name",
    class: "Class",
    description: "Description",
    saveName: "Save name",
    blueprintName: "Blueprint name",
    baseName: "File name (layout and pictures)",
    invalidId: "Use only letters, digits and underscores.",
    confirmRename: {
      title: "Change the save name?",
      message:
        "This ship comes from the game. With a new save name it is saved as a separate ship and the original stays as it is.",
      confirm: "Rename",
    },
  },

  crew: {
    noCrew: "No crew yet.",
    addRace: "Add race…",
    races: "Races",
    abilities: "Abilities",
    amount: "Amount",
    amountOf: (race: string) => `${race} crew`,
    removeRace: (race: string) => `Remove ${race}`,
  },

  sections: {
    position: "Position and size",
    roomSystems: "Systems in this room",
    addSystem: "Add a system",
    pictures: "Pictures",
    mounts: "Weapon mounts",
    gibs: "Explosion pieces",
    info: "Info",
    stats: "Stats",
    crew: "Crew",
    weapons: "Weapons",
    drones: "Drones",
    augments: "Augments",
    count: (n: number, max: number) => `${n} / ${max}`,
    mountsHint: (key: string) =>
      `The Mount tool (${key}) adds mounts on the hull. Weapons take the mounts in the order of their numbers.`,
  },

  /** Hover help for the fields: a title (the field's label) and what it means in the game. */
  help: {
    roomPosition: {
      title: "Room position",
      body: "Where the room's top-left corner is, in tiles from the top-left of the ship's layout. One tile is 35 px.",
    },
    roomSize: {
      title: "Room size",
      body: "The room's width and height in tiles. The game's rooms are 1 or 2 tiles wide and high; interior pictures are drawn for those sizes.",
    },
    systemLevel: {
      title: "Starting level",
      body: "How many power bars the system has when a run starts.",
    },
    upgradeLimit: {
      title: "Upgrade limit",
      body: "The highest level the system can be upgraded to in stores. Without a limit, the game's own maximum for the system applies.",
    },
    installed: {
      title: "Installed at the start",
      body: "On: the ship starts with the system. Off: the room is ready for it, but the system has to be bought in a store first.",
    },
    artilleryWeapon: {
      title: "Artillery weapon",
      body: "The weapon the artillery system fires on its own, like the Federation Cruiser's beam.",
    },
    stationFacing: {
      title: "Crew station",
      body: "The cell where a crew member mans the system, and the way they face there. The Station tool moves the station to another cell.",
    },
    interior: {
      title: "Interior picture",
      body: "The consoles and furniture drawn in the room. Pick one made for the room's size, or none for a bare floor.",
    },
    mountOrder: {
      title: "Mount order",
      body: "Weapons take the mounts in order: the first weapon slot is drawn on mount 1, the second on mount 2, and so on.",
    },
    mountRotate: {
      title: "Rotate",
      body: "On: the weapon lies on its side, as on the player's ships, and fires to the right. Off: it stands upright, as on enemy ships.",
    },
    mountMirror: {
      title: "Mirror",
      body: "Flips the weapon picture. The player's ships mirror the weapons on the top half of the hull.",
    },
    mountSlide: {
      title: "Slides out",
      body: "The way the weapon slides out of the hull when it is powered.",
    },
    mountGib: {
      title: "Flies off with",
      body: "The explosion piece the weapon stays on when the ship is destroyed.",
    },
    mountPosition: {
      title: "Mount position",
      body: "Where the weapon sits, in pixels from the top-left of the hull picture.",
    },
    gibPosition: {
      title: "Piece position",
      body: "Where the explosion piece sits, in pixels from the top-left of the hull picture.",
    },
    gibVelocity: {
      title: "Velocity",
      body: "How fast the piece flies away when the ship explodes; the game picks a value between Min and Max.",
    },
    gibDirection: {
      title: "Direction",
      body: "The direction the piece flies away in, in degrees; the game picks a value between Min and Max.",
    },
    gibTurning: {
      title: "Turning",
      body: "How fast the piece spins as it flies; the game picks a value between Min and Max. Negative values spin the other way.",
    },
    moveWhich: {
      title: "Picture to move",
      body: "Which picture the Move picture tool moves: the one under the pointer, or always the one chosen here.",
    },
    keepMounts: {
      title: "Keep mounts in place",
      body: "Off: the weapon mounts move with the hull picture, since they sit on it. On: the mounts stay where they are on the ship while the hull picture moves under them.",
    },
    weaponSlots: {
      title: "Weapon slots",
      body: "How many weapons the ship can carry. The game's own ships have 3 or 4; the weapon bar shows 4 at most.",
    },
    droneSlots: {
      title: "Drone slots",
      body: "How many drones the ship can carry. The game's own ships have 2 or 3.",
    },
    missiles: {
      title: "Starting missiles",
      body: "Missiles in stock when a run starts. Missile weapons and bombs use one each shot.",
    },
    droneParts: {
      title: "Starting drone parts",
      body: "Drone parts in stock when a run starts. Launching a drone uses one.",
    },
    shipName: {
      title: "Name",
      body: "The ship's name, shown in large letters when the ship is chosen in the hangar.",
    },
    shipClass: {
      title: "Class",
      body: "The type of ship, shown under its name in the hangar.",
    },
    shipDescription: {
      title: "Description",
      body: "The text the hangar shows when the ship is selected.",
    },
    blueprintName: {
      title: "Blueprint name",
      body: "The name the game's files use for this ship, such as PLAYER_SHIP_HARD for the Kestrel. Keep a game ship's name to replace that ship in the hangar.",
    },
    baseName: {
      title: "File name",
      body: "The start of the ship's file names: the layout files and the pictures, such as kestral.txt and kestral_base.png for the Kestrel.",
    },
    hull: {
      title: "Hull",
      body: "The ship's hull points: how much damage it takes before it is destroyed. The game shows them as the green bar at the top left. The game's own ships start with 30.",
    },
    reactor: {
      title: "Reactor",
      body: "The reactor's power at the start: the bars that power the systems. It can be upgraded in stores up to 25.",
    },
    crewAmount: {
      title: "Crew amount",
      body: "How many crew members of this race the ship starts with. A ship holds 8 at most.",
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
    crewCell: (name: string, cell: number) => `${name}: crew cell ${cell}, kept as it is`,
    delete: "Delete",
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
      "No system on this ship has a crew station yet. Put piloting, doors, sensors, weapons, shields, engines or hacking in a room first.",
    ship: {
      eyebrow: "Info, stats, crew and equipment",
      title: "Ship",
    },
    rooms: {
      title: "Rooms",
    },
    hull: {
      eyebrow: "Pictures, weapon mounts and explosion pieces",
      title: "Hull",
    },
  },

  status: {
    game: (file: string, ships: number) => `Game data: ${file} · ${plural(ships, "ship", "ships")}`,
    noMod: "no mod",
    mod: (name: string) => `mod ${name}`,
    counts: (rooms: number, doors: number, zoom: number) =>
      `${plural(rooms, "room", "rooms")} · ${plural(doors, "door", "doors")} · zoom ${zoom}%`,
  },

  checks: {
    /** One line per check, under the overview item it belongs to. */
    messages: {
      "no-name": () => "The ship has no name for the hangar.",
      "no-class": () => "The ship has no class.",
      "no-description": () => "The ship has no description.",
      "no-rooms": () => "The ship has no rooms.",
      "rooms-cut-off": (i: IssueRefs) => `Crew cannot walk to ${rooms(i.rooms)}.`,
      "rooms-off-screen": (i: IssueRefs) =>
        `Outside the part of the screen the game shows: ${rooms(i.rooms)}.`,
      "missing-core-system": (i: IssueRefs) => `The ship starts without ${i.systemName ?? "?"}.`,
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
      "no-hull": () => "The ship has no hull picture; choose one in Hull.",
      "no-shield": () => "The ship has no shield picture.",
      "no-ship-icon": () => "The ship has no ship icon.",
      "few-mounts": () => "The ship has fewer weapon mounts than weapon slots.",
      "gib-no-picture": (i: IssueRefs) => `Gib ${(i.gib ?? 0) + 1} has no picture.`,
      "mount-gib-missing": (i: IssueRefs) =>
        `Mount ${(i.mount ?? 0) + 1} flies off with a gib that does not exist.`,
      "too-many-weapons": () => "The ship has more weapons than weapon slots.",
      "too-many-drones": () => "The ship has more drones than drone slots.",
      "unknown-weapon": (i: IssueRefs) => `The game has no weapon named ${i.item ?? "?"}.`,
      "unknown-drone": (i: IssueRefs) => `The game has no drone named ${i.item ?? "?"}.`,
      "no-crew": () => "The ship starts without crew.",
      "no-hull-points": () => "The ship starts with 0 hull points.",
    } satisfies Record<CheckCode, (issue: IssueRefs) => string>,
  },

  overview: {
    button: "Overview",
    /** The accessible name of the top bar button, with what its badge shows. */
    buttonLabel: (problems: number, checks: number) =>
      problems > 0
        ? `Overview: ${plural(problems, "problem", "problems")}`
        : checks > 0
          ? `Overview: ${checks} to check`
          : "Overview",
    title: "Ship overview",
    intro: "Everything about the ship in one list; click an item to go and fix it.",
    allGood: "Everything looks complete.",
    problems: (n: number) => plural(n, "problem", "problems"),
    toCheck: (n: number) => `${n} to check`,
    needsOnly: "Only what needs a look",
    goThere: "Go there ›",
    /** The accessible name of an item's link. */
    goThereLabel: (title: string) => `Go there: ${title}`,
    status: { ok: "OK", check: "To check", problem: "Problem" },
    /** The items of the overview: a title, what to do when the item needs a look, and the value shown while it is ok. */
    items: {
      name: {
        title: "Name",
        explain: "The hangar shows the ship without a name. Type one under Info in Ship.",
      },
      class: {
        title: "Class",
        explain:
          "The ship has no class, the line the hangar shows under its name. Type one under Info in Ship.",
      },
      description: {
        title: "Description",
        explain: "The hangar shows no description of the ship. Write one under Info in Ship.",
        value: "Written",
      },
      saveName: {
        title: "Save name",
        explain: "",
        value: (blueprint: string, base: string) => `${blueprint} · Files will be named ${base}`,
      },
      hullReactor: {
        title: "Hull and reactor",
        explain: "A ship with 0 hull points is destroyed at once. Set the hull in Ship.",
        value: (hull: number, reactor: number) => `${hull} hull, ${reactor} reactor bars`,
      },
      crew: {
        title: "Crew",
        explain: "The ship starts without crew, so nobody can man its systems. Add crew in Ship.",
        value: (n: number, max: number) => `${n} of ${max}`,
      },
      slots: {
        title: "Weapon and drone slots",
        explain:
          "The ship carries more weapons or drones than it has slots for. Remove some in Ship, or add slots.",
        value: (weapons: number, weaponSlots: number, drones: number, droneSlots: number) =>
          `Weapons ${weapons}/${weaponSlots}, drones ${drones}/${droneSlots}`,
      },
      knownItems: {
        title: "Weapons and drones the game knows",
        explain:
          "The game has no blueprint for these items; they may come from a mod that is not loaded. Replace them in Ship.",
        value: "All known",
        none: "None fitted",
      },
      rooms: {
        title: "Rooms",
        explain: "A ship needs rooms. Draw them with the Room tool in Rooms.",
        value: (n: number) => `Rooms: ${n}`,
      },
      overlap: {
        title: "Rooms don't overlap",
        explain: "Rooms that share cells confuse the game. Move or resize them in Rooms.",
      },
      roomIds: {
        title: "Room sizes and ids",
        explain:
          "Every room must be at least one cell, and the ids must run 0, 1, 2… in order. Fix the rooms in Rooms.",
      },
      doors: {
        title: "Doors are attached to rooms",
        explain:
          "These doors touch no room, or name other rooms than the ones beside them. Move or remove them in Rooms.",
        value: (n: number) => `Doors: ${n}`,
      },
      reach: {
        title: "Crew can walk everywhere",
        explain:
          "No door leads to these rooms from the rest of the ship (airlocks do not count), so crew cannot go there to man, repair or fight. Add doors in Rooms.",
      },
      airlocks: {
        title: "Airlocks",
        explain: "An airlock on a room bigger than 2×2 vents it only partly. Move it in Rooms.",
        value: (n: number) => `Airlocks: ${n}`,
      },
      onScreen: {
        title: "Everything on screen",
        explain:
          "These rooms lie outside the red frame, the part of the screen the game shows. Move the rooms (or the ship's offsets) in Rooms.",
        value: "Inside the frame",
        notPlayer: "Only for player ships",
      },
      stations: {
        title: "Crew stations are inside their rooms",
        explain: "A crew station outside its room cannot be manned. Place it again in Rooms.",
      },
      systemRooms: {
        title: "Systems are in existing rooms",
        explain: "A system sits in a room that does not exist. Put it in a room in Rooms.",
      },
      oneSystem: {
        title: "One system per room at the start",
        explain:
          "Only one system of a room can be installed at the start; the others must be bought later. Change them in Rooms.",
      },
      pairs: {
        title: "Systems sharing a room are a usual pair",
        explain:
          "The game only puts the medbay with the clonebay, and mind control with the teleporter, in one room. Other pairs may not work. Check them in Rooms.",
      },
      coreSystems: {
        title: "Core systems",
        explain:
          "A ship needs piloting and engines to dodge and jump, oxygen to keep its crew alive and shields against weapons; without one of them from the start it is hard to play (the game's stealth cruisers do without shields on purpose). Add the missing ones in Rooms.",
        value: (n: number) => `Systems: ${n}`,
      },
      interiors: {
        title: "Interior pictures fit their rooms",
        explain:
          "A cloaking interior picture that does not fit its room made the game crash. Choose another one in Rooms.",
      },
      hull: {
        title: "Hull picture",
        explain: "Without a hull picture the ship cannot be saved as a mod. Choose one in Hull.",
      },
      floor: { title: "Floor picture", explain: "" },
      shield: {
        title: "Shield picture",
        explain: "The game draws the ship's shields with this picture. Choose one in Hull.",
      },
      cloak: { title: "Cloak picture", explain: "" },
      shipIcon: {
        title: "Ship icon",
        explain: "The hangar's ship list shows this small picture. Choose one in Hull.",
      },
      gibs: {
        title: "Explosion pieces",
        explain:
          "These pieces have no picture, so nothing flies off there when the ship explodes. Choose pictures in Hull.",
        value: (n: number) => `Pieces: ${n}`,
      },
      mounts: {
        title: "Weapon mounts",
        explain:
          "Each weapon slot draws its weapon on a mount; slots without a mount show no weapon. Add mounts with the Mount tool in Hull.",
        value: (mounts: number, slots: number) => `Mounts ${mounts}, weapon slots ${slots}`,
      },
      mountGibs: {
        title: "Mounts and their gibs",
        explain:
          "These mounts fly off with explosion pieces that do not exist. Choose another piece for them in Hull.",
      },
    } satisfies Record<OverviewItemId, ItemTexts>,
    /** Names of the core systems when the game data has none. */
    coreSystemNames: {
      pilot: "Piloting",
      engines: "Engines",
      oxygen: "Oxygen",
      shields: "Shields",
    } as Record<string, string>,
    pictureSet: "Set",
    pictureNone: "None",
  },

  save: {
    title: "Save mod",
    ftl: ".ftl file",
    ftlHint: "One file, ready for Slipstream Mod Manager.",
    folder: "Mod folder",
    folderHint:
      "Writes the files into a folder. A mod already in it keeps its other ships and files.",
    overviewWarning: (problems: number, checks: number) => {
      const found = [
        ...(problems > 0 ? [plural(problems, "problem", "problems")] : []),
        ...(checks > 0 ? [plural(checks, "item to check", "items to check")] : []),
      ];
      return `The Overview lists ${found.join(" and ")}. The ship can still be saved.`;
    },
    saving: "Saving…",
    savedTo: (path: string) => `Saved to ${path}`,
    failed: (reason: string) => `Could not save: ${reason}`,
    needHull: "The ship has no hull picture yet, so it cannot be saved as a mod.",
    ftlFilter: "FTL mod",
  },

  settings: {
    title: "Settings",
    sections: "Settings sections",
    general: "General",
    shortcuts: "Shortcuts",
    scale: "Interface scale",
    scaleHint: "Makes every button, icon and text bigger or smaller.",
    scaleValue: (percent: number) => `${percent}%`,
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    language: "Language",
  },

  shortcuts: {
    hint: "Keys are read by their place on the keyboard, so they work with any keyboard layout.",
    tools: "Tools",
    editing: "Editing",
    names: {
      "tool.select": "Select tool",
      "tool.room": "Room tool",
      "tool.door": "Door tool",
      "tool.station": "Station tool",
      "tool.movePicture": "Move picture tool",
      "tool.mount": "Mount tool",
      "tool.gib": "Gib tool",
      undo: "Undo",
      redo: "Redo",
      delete: "Delete selected",
    } satisfies Record<RebindableCommand, string>,
    change: (name: string, key: string) => `${name}: ${key}. Change the key`,
    pressKey: "Press a key…",
    capturing: (name: string) => `Press the new key for ${name}, or Esc to cancel`,
    reset: (name: string, key: string) => `Reset ${name} to ${key}`,
    resetAll: "Reset all to default",
    taken: (key: string, other: string, otherNew: string) =>
      `${key} is already used by ${other}. Swap them, so that ${other} gets ${otherNew}?`,
    swap: "Swap",
    fixed: (key: string, what: string) => `${key} is a fixed key: it ${what}. Choose another key.`,
    fixedActions: {
      redo: "redoes",
      save: "saves",
      cancel: "cancels",
      pan: "pans the view",
      delete: "deletes the selection",
      move: "moves the selection",
      workspace: "opens a workspace",
      mount: "turns the selected mount",
    },
    fixedTitle: "Fixed keys",
    fixedKeys: [
      ["Delete selected", "Del · Backspace"],
      ["Redo", "Ctrl+Shift+Z"],
      ["Move the selection", "Arrows"],
      ["Move the selection by 10", "Shift+Arrows"],
      ["Cancel", "Esc"],
      ["Pan the view", "Space"],
      ["Save", "Ctrl+S"],
      ["Pick a workspace", "1 · 2 · 3"],
      ["Rotate / mirror the selected mount", "[ · ]"],
    ] as Array<[string, string]>,
  },

  errors: {
    unknown: "unknown error",
    shipNotFound: "the ship's blueprint or layout files are missing",
  },
};

export type Texts = typeof en;
