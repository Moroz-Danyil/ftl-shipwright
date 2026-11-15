/**
 * The one store of the app: game data, the open ship with its undo history,
 * the selection, the workspace and tool, the view settings, what the Info
 * panel describes, the look of the interface and the keyboard shortcuts.
 */
import { create } from "zustand";
import type { Animations, Catalogs, FileSource, GameTexts, GameView, Ship } from "../core";
import { DEFAULT_EXPLOSION_SPEED, type ExplosionSpeed } from "./art/explosion";
import type { PictureSlot, ShipArt, ShipSnapshot } from "./art/model";
import type { MovablePicture } from "./art/pictures";
import type { ModRef } from "../platform/types";
import type { InfoPick } from "./info";
import { canRedo, canUndo, createHistory, record, redo, undo, type History } from "./history";
import {
  EMPTY_SELECTION,
  selectionOf,
  singleTarget,
  validSelection,
  type Selection,
} from "./selection";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../text";
import {
  loadDatPath,
  loadInfoPanelOpen,
  loadKeyMap,
  loadLanguage,
  loadMod,
  loadOfferTour,
  loadRecent,
  loadTheme,
  loadUiScale,
  saveInfoPanelOpen,
  saveKeyMap,
  saveLanguage,
  saveOfferTour,
  saveTheme,
  saveUiScale,
  type RecentShip,
  type ShipOrigin,
  type Theme,
} from "./settings";
import { DEFAULT_KEYS, keyLabel, rebind, type KeyMap, type RebindableCommand } from "./keys";
import { WORKSPACE_TOOLS, hasTool, type ToolId, type WorkspaceId } from "./workspaces";

// ---------------------------------------------------------------------------
// Game data

export type LoadStep = "archive" | "mod" | "texts" | "catalogs" | "animations";

/** Everything read from the game (with the mod applied). */
export interface GameData {
  datPath: string;
  mod?: ModRef;
  /** The game without the mod. */
  base: FileSource;
  /** The game with the mod applied. */
  view: GameView;
  texts: GameTexts;
  catalogs: Catalogs;
  animations: Animations;
}

export interface GameState {
  datPath?: string;
  mod?: ModRef;
  status: "none" | "loading" | "ready" | "error";
  step?: LoadStep;
  error?: string;
  data?: GameData;
}

// ---------------------------------------------------------------------------
// The open ship

export type SaveTarget = { kind: "ftl"; path: string } | { kind: "folder"; path: string };

export interface ShipDocument {
  /** Changes every time a ship is opened, so views can reset (e.g. fit the ship). */
  id: number;
  /** The ship and its pictures, with undo. */
  history: History<ShipSnapshot>;
  /** The snapshot last saved or opened; absent for a ship never saved. */
  saved?: ShipSnapshot;
  /** Where the ship can be opened again; absent for a new ship not saved yet. */
  origin?: ShipOrigin;
  /** Where the ship was saved last in this session. */
  saveTarget?: SaveTarget;
}

// ---------------------------------------------------------------------------
// View

export const LAYERS = [
  "hull",
  "floor",
  "cloak",
  "shield",
  "grid",
  "rooms",
  "roomNumbers",
  "interiors",
  "systemIcons",
  "doors",
  "stations",
  "mounts",
  "gibs",
] as const;
export type LayerId = (typeof LAYERS)[number];

export const DEFAULT_LAYERS: Record<LayerId, boolean> = {
  hull: true,
  floor: true,
  cloak: false,
  shield: true,
  grid: true,
  rooms: true,
  roomNumbers: false,
  interiors: true,
  systemIcons: true,
  doors: true,
  stations: true,
  mounts: true,
  gibs: false,
};

/** Screen position of ship pixel (0, 0) and the zoom: screen = ship · scale + (x, y). */
export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export interface ViewState {
  layers: Record<LayerId, boolean>;
  hangarPreview: boolean;
  camera: Camera;
  /** The pan key (Space) is held. */
  panHeld: boolean;
}

export type DialogId =
  "newShip" | "openShip" | "save" | "overview" | "picture" | "settings" | "tourOffer";

/** What the picture picker chooses a picture for. */
export type PictureTarget = { slot: PictureSlot } | { gib: number } | { newGib: true };

/** Options of the Move picture tool. */
export interface ArtToolOptions {
  /** The picture a drag moves: a chosen one, or the one under the pointer. */
  picture: MovablePicture | "auto";
  /** Moving the hull leaves the mounts where they are on the ship. */
  keepMounts: boolean;
  /** The picture moved last; the arrow keys move it. */
  active: MovablePicture | null;
}

/** A system chip being dragged from the palette. */
export interface SystemDrag {
  system: string;
  /** The pointer, in window coordinates. */
  clientX: number;
  clientY: number;
  /** The room under the pointer, if any. */
  room: number | null;
  /** Where a drop would go: a room, empty canvas or the palette (both remove), or nowhere. */
  target: "room" | "remove" | "none";
}

/**
 * A message at the bottom of the editor. An `info` message goes away by
 * itself; an error stays until closed, and so does an `issue`: what is wrong
 * with the ship and what to do, shown after a click in the Overview.
 */
export interface Notice {
  kind: "error" | "info" | "issue";
  text: string;
  /** An issue's title (the Overview item) and how bad it is. */
  title?: string;
  status?: "check" | "problem";
  /** An issue's lines: the rooms, doors, mounts or items involved. */
  details?: string[];
}

/**
 * What a click in the Overview points at, flashed for a few seconds: a field
 * (an element with that `data-field`), else the inspector section (its
 * `data-section`), and the objects on the canvas.
 */
export interface Flash {
  /** Changes with every flash, so the same target can flash again. */
  key: number;
  field?: string;
  section?: string;
  objects: Selection;
}

/** How long a flash lasts. */
export const FLASH_MS = 3500;

/** The guided tour while it runs. */
export interface TourState {
  /** The step shown, from 0. */
  step: number;
  /** What the tour changes and puts back when it ends. */
  before: { workspace: WorkspaceId; selection: Selection };
}

/** A yes/no question asked in the app's own dialog. */
export interface ConfirmRequest {
  title: string;
  message: string;
  /** The confirm button's verb, e.g. "Delete". */
  confirm: string;
  /** Something is lost when confirmed: the confirm button is red and Cancel has the focus. */
  danger?: boolean;
}

/** The question on screen and how its answer is passed on. */
export interface Confirmation extends ConfirmRequest {
  resolve(yes: boolean): void;
}

// ---------------------------------------------------------------------------

export interface EditorState {
  language: string;
  theme: Theme;
  /** The interface scale in percent. */
  uiScale: number;
  /** The chosen keys of the commands whose key can be changed. */
  keys: KeyMap;
  game: GameState;
  recent: RecentShip[];
  doc?: ShipDocument;
  selection: Selection;
  /** The system whose station the Station tool places (index in the blueprint). */
  stationSystem: number | null;
  systemDrag: SystemDrag | null;
  artTool: ArtToolOptions;
  pictureTarget: PictureTarget | null;
  /** The weapon slot (and so the mount) under the pointer in Ship, to highlight both. */
  hoverWeapon: number | null;
  /**
   * The item last clicked in a list of the inspector, which the Info panel
   * describes until something is selected or another workspace is opened.
   */
  infoPick: InfoPick | null;
  /** The Info panel on the right is open (remembered between runs). */
  infoPanelOpen: boolean;
  workspace: WorkspaceId;
  /** The chosen tool of each workspace. */
  tools: Record<WorkspaceId, ToolId>;
  view: ViewState;
  dialog: DialogId | null;
  /** Inspector sections opened in this run of the app, by section id; the rest are folded. */
  openSections: Record<string, boolean>;
  /** The ship overview shows only the items that need a look (for the session). */
  overviewNeedsOnly: boolean;
  /** The speed the explosion preview plays at (for the session). */
  explosionSpeed: ExplosionSpeed;
  /** The yes/no question on screen, if any. */
  confirmation: Confirmation | null;
  /** The guided tour, while it runs. */
  tour: TourState | null;
  /** The tour was offered in this run of the app (it is offered once a run at most). */
  tourOffered: boolean;
  notice?: Notice;
  /** The field and objects flashed after a click in the Overview, while they flash. */
  flash: Flash | null;

  setGame(game: Partial<GameState>): void;
  setRecent(recent: RecentShip[]): void;
  /**
   * Opens a ship, in Ship with the Select tool unless `start` names the
   * workspace and tool to begin with.
   */
  openDocument(input: {
    ship: Ship;
    art: ShipArt;
    origin?: ShipOrigin;
    saveTarget?: SaveTarget;
    saved: boolean;
    start?: { workspace: WorkspaceId; tool?: ToolId };
  }): void;
  closeDocument(): void;
  /**
   * Applies an edit to the ship as one undo step, and optionally sets what is
   * selected afterwards.
   */
  edit(change: (ship: Ship) => Ship, selection?: Selection): void;
  /** Like `edit`, for changes that also touch the pictures. */
  editSnapshot(change: (snapshot: ShipSnapshot) => ShipSnapshot, selection?: Selection): void;
  undo(): void;
  redo(): void;
  /** Records that this snapshot (the present one, or an earlier one) was saved to the target. */
  markSaved(snapshot: ShipSnapshot, target: SaveTarget, origin: ShipOrigin): void;
  /**
   * Selects. A single room with systems also opens the Rooms inspector's
   * "Systems in this room" section, which then stays open as any section does.
   */
  select(selection: Selection): void;
  /** Opens Rooms with the Select tool and the room selected (with its systems' section open). */
  goToRoom(id: number): void;
  setStationSystem(system: number | null): void;
  setSystemDrag(drag: SystemDrag | null): void;
  setArtTool(options: Partial<ArtToolOptions>): void;
  openPicturePicker(target: PictureTarget): void;
  setHoverWeapon(index: number | null): void;
  /** Makes an item clicked in a list the Info panel's subject (`null`: the selection again). */
  pickInfo(pick: InfoPick | null): void;
  setInfoPanelOpen(open: boolean): void;
  setWorkspace(workspace: WorkspaceId): void;
  setTool(tool: ToolId): void;
  setLayer(layer: LayerId, visible: boolean): void;
  setHangarPreview(on: boolean): void;
  setCamera(camera: Camera): void;
  setPanHeld(held: boolean): void;
  openDialog(dialog: DialogId | null): void;
  setSectionOpen(id: string, open: boolean): void;
  setOverviewNeedsOnly(on: boolean): void;
  setExplosionSpeed(speed: ExplosionSpeed): void;
  /**
   * Asks a yes/no question in the app's own dialog and resolves with the
   * answer. A question still open is answered no.
   */
  askConfirm(request: ConfirmRequest): Promise<boolean>;
  /** Answers the question on screen. */
  answerConfirm(yes: boolean): void;
  setNotice(notice: Notice | undefined): void;
  /** Flashes a field or section and objects for {@link FLASH_MS}. */
  startFlash(target: Omit<Flash, "key">): void;
  /**
   * Starts the guided tour: closes any dialog and clears the selection, which
   * comes back with the workspace when the tour ends.
   */
  startTour(): void;
  setTourStep(step: number): void;
  /**
   * Ends the tour and puts the workspace and selection back. A tour seen to
   * its end or skipped is not offered again.
   */
  endTour(): void;
  /**
   * Answers the offer of a tour: start it, skip it (it is offered again in
   * the next run of the app) or never offer it again.
   */
  answerTourOffer(answer: "start" | "skip" | "never"): void;
  setLanguage(language: string): void;
  setTheme(theme: Theme): void;
  setUiScale(scale: number): void;
  /**
   * Gives keys to a command; a command that had them gets its old keys in
   * exchange. Fixed keys are refused.
   */
  setKey(command: RebindableCommand, keys: string): void;
  /** Gives a command its default keys back (swapping as `setKey` does). */
  resetKey(command: RebindableCommand): void;
  resetAllKeys(): void;
}

let nextDocumentId = 1;
let nextFlashKey = 1;

/** The id of the Rooms inspector's "Systems in this room" section. */
export const ROOM_SYSTEMS_SECTION = "room-systems";

const initialTools = (): Record<WorkspaceId, ToolId> => ({
  ship: "select",
  rooms: "select",
  hull: "select",
});

/** The state on start: remembered paths and recent ships, nothing open. */
export function initialEditorState() {
  const datPath = loadDatPath();
  const language = loadLanguage();
  return {
    language: language && LANGUAGES[language] ? language : DEFAULT_LANGUAGE,
    theme: loadTheme(),
    uiScale: loadUiScale(),
    keys: loadKeyMap(),
    game: { datPath, mod: datPath ? loadMod() : undefined, status: "none" } as GameState,
    recent: loadRecent(),
    doc: undefined,
    selection: EMPTY_SELECTION,
    stationSystem: null as number | null,
    systemDrag: null as SystemDrag | null,
    artTool: { picture: "auto", keepMounts: false, active: null } as ArtToolOptions,
    pictureTarget: null as PictureTarget | null,
    hoverWeapon: null as number | null,
    infoPick: null as InfoPick | null,
    infoPanelOpen: loadInfoPanelOpen(),
    workspace: "ship" as WorkspaceId,
    tools: initialTools(),
    view: {
      layers: { ...DEFAULT_LAYERS },
      hangarPreview: false,
      camera: { x: 0, y: 0, scale: 1 },
      panHeld: false,
    },
    dialog: null,
    openSections: {} as Record<string, boolean>,
    overviewNeedsOnly: false,
    explosionSpeed: DEFAULT_EXPLOSION_SPEED as ExplosionSpeed,
    confirmation: null as Confirmation | null,
    tour: null as TourState | null,
    tourOffered: false,
    notice: undefined,
    flash: null as Flash | null,
  };
}

export const useEditor = create<EditorState>()((set, get) => {
  const changeHistory = (
    change: (h: History<ShipSnapshot>) => History<ShipSnapshot>,
    next?: Selection
  ) => {
    const { doc, selection } = get();
    if (!doc) return;
    const history = change(doc.history);
    if (history === doc.history) {
      if (next) set({ selection: validSelection(history.present.ship, next) });
      return;
    }
    set({
      doc: { ...doc, history },
      selection: validSelection(history.present.ship, next ?? selection),
    });
  };
  const recordSnapshot = (h: History<ShipSnapshot>, next: ShipSnapshot) =>
    next.ship === h.present.ship && next.art === h.present.art ? h : record(h, next);

  return {
    ...initialEditorState(),

    setGame: (game) => set({ game: { ...get().game, ...game } }),
    setRecent: (recent) => set({ recent }),

    openDocument: ({ ship, art, origin, saved, saveTarget, start }) => {
      const snapshot: ShipSnapshot = { ship, art };
      // The first ship opened in a run of the app comes with the offer of a tour.
      const offerTour = !get().tourOffered && loadOfferTour();
      set({
        doc: {
          id: nextDocumentId++,
          history: createHistory(snapshot),
          saved: saved ? snapshot : undefined,
          origin,
          saveTarget,
        },
        selection: EMPTY_SELECTION,
        stationSystem: null,
        systemDrag: null,
        artTool: { picture: "auto", keepMounts: false, active: null },
        pictureTarget: null,
        hoverWeapon: null,
        infoPick: null,
        workspace: start?.workspace ?? "ship",
        tools:
          start?.tool && hasTool(start.workspace, start.tool)
            ? { ...initialTools(), [start.workspace]: start.tool }
            : initialTools(),
        view: { ...get().view, hangarPreview: false, panHeld: false },
        dialog: offerTour ? "tourOffer" : null,
        tour: null,
        tourOffered: get().tourOffered || offerTour,
        flash: null,
      });
    },

    closeDocument: () =>
      set({
        doc: undefined,
        selection: EMPTY_SELECTION,
        infoPick: null,
        dialog: null,
        tour: null,
        flash: null,
      }),

    edit: (change, selection) =>
      changeHistory(
        (h) => recordSnapshot(h, { ...h.present, ship: change(h.present.ship) }),
        selection
      ),
    editSnapshot: (change, selection) =>
      changeHistory((h) => recordSnapshot(h, change(h.present)), selection),
    undo: () => changeHistory(undo),
    redo: () => changeHistory(redo),

    markSaved: (snapshot, target, origin) => {
      const doc = get().doc;
      if (doc) set({ doc: { ...doc, saved: snapshot, saveTarget: target, origin } });
    },

    // A selection made by the user is what the Info panel describes next.
    select: (selection) => {
      const ship = get().doc?.history.present.ship;
      const next = ship ? validSelection(ship, selection) : selection;
      const target = singleTarget(next);
      const opensSystems =
        target?.kind === "room" &&
        !!ship?.blueprint.systems.some((s) => s.room === target.id) &&
        !get().openSections[ROOM_SYSTEMS_SECTION];
      set({
        selection: next,
        infoPick: null,
        ...(opensSystems && {
          openSections: { ...get().openSections, [ROOM_SYSTEMS_SECTION]: true },
        }),
      });
    },
    goToRoom: (id) => {
      const { workspace, tools } = get();
      if (workspace !== "rooms" || tools.rooms !== "select")
        set({ workspace: "rooms", tools: { ...tools, rooms: "select" }, infoPick: null });
      get().select(selectionOf({ kind: "room", id }));
    },
    setStationSystem: (stationSystem) => set({ stationSystem }),
    setSystemDrag: (systemDrag) => set({ systemDrag }),
    setArtTool: (options) => set({ artTool: { ...get().artTool, ...options } }),
    openPicturePicker: (pictureTarget) => set({ pictureTarget, dialog: "picture" }),
    setHoverWeapon: (hoverWeapon) => {
      if (get().hoverWeapon !== hoverWeapon) set({ hoverWeapon });
    },
    pickInfo: (infoPick) => {
      if (get().infoPick !== infoPick) set({ infoPick });
    },
    setInfoPanelOpen: (infoPanelOpen) => {
      saveInfoPanelOpen(infoPanelOpen);
      set({ infoPanelOpen });
    },

    setWorkspace: (workspace) => {
      if (workspace !== get().workspace) set({ workspace, infoPick: null });
    },

    setTool: (tool) => {
      const { workspace, tools } = get();
      if (hasTool(workspace, tool)) set({ tools: { ...tools, [workspace]: tool } });
    },

    setLayer: (layer, visible) =>
      set({ view: { ...get().view, layers: { ...get().view.layers, [layer]: visible } } }),
    setHangarPreview: (hangarPreview) => set({ view: { ...get().view, hangarPreview } }),
    setCamera: (camera) => set({ view: { ...get().view, camera } }),
    setPanHeld: (panHeld) => {
      if (get().view.panHeld !== panHeld) set({ view: { ...get().view, panHeld } });
    },

    openDialog: (dialog) => set({ dialog }),
    setSectionOpen: (id, open) => set((s) => ({ openSections: { ...s.openSections, [id]: open } })),
    setOverviewNeedsOnly: (overviewNeedsOnly) => set({ overviewNeedsOnly }),
    setExplosionSpeed: (explosionSpeed) => set({ explosionSpeed }),
    askConfirm: (request) =>
      new Promise<boolean>((resolve) => {
        get().confirmation?.resolve(false);
        set({ confirmation: { ...request, resolve } });
      }),
    answerConfirm: (yes) => {
      const open = get().confirmation;
      if (!open) return;
      set({ confirmation: null });
      open.resolve(yes);
    },
    setNotice: (notice) => set({ notice }),
    startFlash: (target) => {
      const flash: Flash = { ...target, key: nextFlashKey++ };
      set({ flash });
      setTimeout(() => {
        if (get().flash === flash) set({ flash: null });
      }, FLASH_MS);
    },

    startTour: () => {
      const { doc, workspace, selection, view } = get();
      if (!doc) return;
      set({
        tour: { step: 0, before: { workspace, selection } },
        selection: EMPTY_SELECTION,
        infoPick: null,
        dialog: null,
        systemDrag: null,
        hoverWeapon: null,
        view: { ...view, hangarPreview: false, panHeld: false },
      });
    },
    setTourStep: (step) => {
      const tour = get().tour;
      if (tour && tour.step !== step) set({ tour: { ...tour, step } });
    },
    endTour: () => {
      const tour = get().tour;
      if (!tour) return;
      saveOfferTour(false);
      set({ tour: null, workspace: tour.before.workspace });
      get().select(tour.before.selection);
    },
    answerTourOffer: (answer) => {
      if (get().dialog === "tourOffer") set({ dialog: null });
      if (answer === "start") get().startTour();
      else if (answer === "never") saveOfferTour(false);
    },

    setLanguage: (language) => {
      saveLanguage(language);
      set({ language });
    },
    setTheme: (theme) => {
      saveTheme(theme);
      set({ theme });
    },
    setUiScale: (uiScale) => {
      saveUiScale(uiScale);
      set({ uiScale });
    },
    setKey: (command, keys) => {
      const next = rebind(get().keys, command, keys);
      if (next === get().keys) return;
      saveKeyMap(next);
      set({ keys: next });
    },
    resetKey: (command) => get().setKey(command, DEFAULT_KEYS[command]),
    resetAllKeys: () => {
      saveKeyMap(DEFAULT_KEYS);
      set({ keys: { ...DEFAULT_KEYS } });
    },
  };
});

/** Puts the store back to its starting state (tests, and a clean start). */
export function resetEditorStore(): void {
  useEditor.getState().confirmation?.resolve(false);
  useEditor.setState(initialEditorState());
}

// ---------------------------------------------------------------------------
// Selectors

export const currentShip = (s: EditorState): Ship | undefined => s.doc?.history.present.ship;

export const currentArt = (s: EditorState): ShipArt | undefined => s.doc?.history.present.art;

export const currentTool = (s: EditorState): ToolId => {
  const tool = s.tools[s.workspace];
  return WORKSPACE_TOOLS[s.workspace].includes(tool) ? tool : "select";
};

/** A selector of how the key of a command is shown, e.g. `Q` or `Ctrl+Z`. */
export const keyOf =
  (command: RebindableCommand) =>
  (s: EditorState): string =>
    keyLabel(s.keys[command]);

/** True when the ship differs from the one last saved (or was never saved). */
export const hasUnsavedChanges = (s: EditorState): boolean => {
  const doc = s.doc;
  if (!doc) return false;
  const { present } = doc.history;
  return present.ship !== doc.saved?.ship || present.art !== doc.saved.art;
};

export const undoAvailable = (s: EditorState) => !!s.doc && canUndo(s.doc.history);
export const redoAvailable = (s: EditorState) => !!s.doc && canRedo(s.doc.history);
