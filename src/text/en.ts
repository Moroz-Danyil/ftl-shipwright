/**
 * The English texts of the interface. Every user-visible string of the app
 * comes from here; other languages are objects of the same type.
 */
import type { CheckCode } from "../app/checks";
import type { ToolId, WorkspaceId } from "../app/workspaces";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const list = (ids: number[] | undefined) => (ids && ids.length > 0 ? ids.join(" and ") : "?");

/** What a check refers to: rooms by id, a door by its index. */
interface IssueRefs {
  rooms?: number[];
  door?: number;
  mount?: number;
  gib?: number;
  item?: string;
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
    create: "Create",
  },

  openShip: {
    title: "Open a ship",
    open: "Open",
    failed: (name: string, reason: string) => `Could not open ${name}: ${reason}`,
  },

  workspaces: {
    ship: {
      label: "Ship",
      hint: "Ship — info, stats, crew and equipment; weapons and drones fill the slots in order",
    },
    rooms: {
      label: "Rooms",
      hint: "Rooms — draw rooms and doors, drag systems onto them, place crew stations",
    },
    hull: { label: "Hull", hint: "Hull — pictures, weapon mounts and explosion pieces" },
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
    checks: (n: number) => (n === 0 ? "No checks" : `${n} to check`),
    settings: "Settings",
    saveMod: "Save mod",
  },

  /** What each tool of each workspace does, shown beside the tool rail and in the inspector. */
  toolHelp: {
    ship: {
      select: {
        title: "Select tool (V)",
        body: "Click a slot in the bar under the ship to select it; Delete removes its weapon or drone. Hover a slot to see its mount on the hull. Preview in hangar shows the ship as the game's hangar does.",
      },
    },
    rooms: {
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
        body: "Click a cell of a room with a system to put that system's crew station there. Turn a station in its system's card, or select the station.",
      },
    },
    hull: {
      select: {
        title: "Select tool (V)",
        body: "Click a mount to select it, drag it to move it. Arrows move the selection by 1 px, Shift + arrows by 10 px.",
      },
      movePicture: {
        title: "Move picture tool (H)",
        body: "Drag the hull, floor, cloak or shield picture. Arrows move the picture by 1 px, Shift + arrows by 10 px.",
      },
      mount: {
        title: "Mount tool (M)",
        body: "Click the hull picture to add a weapon mount (at most 8); drag a mount to move it. [ rotates and ] mirrors the selected mount.",
      },
      gib: {
        title: "Gib tool (G)",
        body: "Click an explosion piece to select it, drag it to move it.",
      },
    },
  } satisfies Record<WorkspaceId, Partial<Record<ToolId, { title: string; body: string }>>>,

  toolRail: {
    label: "Tools",
  },

  canvas: {
    label: "Ship canvas",
    layers: "Layers",
    preview: "Preview in hangar",
    previewOff: "Back to editing",
    previewOffKey: "Esc",
    hangarMoreCrew: (n: number) => `+${n} more`,
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
    noStation: "No crew station yet; place it with the Station tool (T).",
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
      "The explosion preview is approximate; the game's units for speed and turning are not confirmed yet.",
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
    mountsHint:
      "The Mount tool (M) adds mounts on the hull. Weapons take the mounts in the order of their numbers.",
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
      body: "The cell where a crew member mans the system, and the way they face there. The Station tool (T) moves the station to another cell.",
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
      "no-hull": () => "The ship has no hull picture; choose one in Hull.",
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

  settings: {
    title: "Settings",
    scale: "Interface scale",
    scaleHint: "Makes every button, icon and text bigger or smaller.",
    scaleValue: (percent: number) => `${percent}%`,
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    language: "Language",
  },

  errors: {
    unknown: "unknown error",
    shipNotFound: "the ship's blueprint or layout files are missing",
  },
};

export type Texts = typeof en;
