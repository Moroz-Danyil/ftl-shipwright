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

  art: {
    pngFilter: "PNG picture",
    fileFailed: (reason: string) => `Could not read the picture: ${reason}`,
    notPng: "That file is not a PNG picture.",
    pictures: "Pictures",
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
    mountsCount: (n: number) => `Weapon mounts ${n} / 8`,
    selectedMount: "Selected weapon mount",
    mount: (n: number) => `Mount ${n}`,
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
    addGib: "Add gib",
    gibsCount: (n: number) => `Explosion pieces ${n}`,
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
    toolHelp: {
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
  },

  loadout: {
    tabs: { weapon: "Weapons", drone: "Drones", augment: "Augments" },
    tabsLabel: "Equipment",
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
    augments: (n: number) => `Augments ${n} / 3`,
    noAugments: "No augments.",
    remove: "Remove",
    removeNamed: (name: string) => `Remove ${name}`,
    earlier: "Earlier",
    later: "Later",
    selectedWeapon: (n: number) => `Weapon slot ${n}`,
    selectedDrone: (n: number) => `Drone slot ${n}`,
    drawnOnMount: (n: number) => `Drawn on mount ${n}.`,
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
    hint: "Click a card to put it in the next free slot. Hover a card for its details.",
  },

  details: {
    eyebrow: "What the hangar shows",
    name: "Name",
    class: "Class",
    description: "Description",
    saveName: "Save name",
    blueprintName: "Blueprint name",
    baseName: "File name (layout and pictures)",
    invalidId: "Use only letters, digits and underscores.",
    confirmRename:
      "This ship comes from the game. With a new save name it is saved as a separate ship and the original stays as it is. Change it?",
    hull: "Hull",
    reactor: "Reactor",
    crew: (n: number) => `Crew ${n} / 8`,
    noCrew: "No crew yet.",
    addRace: "Add race",
    racePlaceholder: "Choose a race…",
    amount: (race: string) => `${race} crew`,
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
    },
    loadout: {
      eyebrow: "Pick from the game's weapons, drones and augments",
      title: "Loadout",
    },
    details: {
      eyebrow: "What the hangar shows",
      title: "Details",
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
      "no-hull": () => "The ship has no hull picture; choose one in Hull & art.",
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
