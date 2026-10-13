/**
 * The one store of the app: game data, the open ship with its undo history,
 * the selection, the workspace and tool, the view settings, and the look of
 * the interface.
 */
import { create } from "zustand";
import type { Animations, Catalogs, FileSource, GameTexts, GameView, Ship } from "../core";
import type { PictureSlot, ShipArt, ShipSnapshot } from "./art/model";
import type { MovablePicture } from "./art/pictures";
import type { ModRef } from "../platform/types";
import { canRedo, canUndo, createHistory, record, redo, undo, type History } from "./history";
import { EMPTY_SELECTION, validSelection, type Selection } from "./selection";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../text";
import {
  loadDatPath,
  loadLanguage,
  loadMod,
  loadRecent,
  loadTheme,
  loadUiScale,
  saveLanguage,
  saveTheme,
  saveUiScale,
  type RecentShip,
  type ShipOrigin,
  type Theme,
} from "./settings";
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

export type DialogId = "newShip" | "openShip" | "save" | "checks" | "picture" | "settings";

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

export interface Notice {
  kind: "error" | "info";
  text: string;
}

// ---------------------------------------------------------------------------

export interface EditorState {
  language: string;
  theme: Theme;
  /** The interface scale in percent. */
  uiScale: number;
  game: GameState;
  recent: RecentShip[];
  doc?: ShipDocument;
  selection: Selection;
  /** The system whose station the Station tool places (index in the blueprint). */
  stationSystem: number | null;
  systemDrag: SystemDrag | null;
  artTool: ArtToolOptions;
  pictureTarget: PictureTarget | null;
  /** The weapon slot (and so the mount) under the pointer in Loadout, to highlight both. */
  hoverWeapon: number | null;
  workspace: WorkspaceId;
  /** The chosen tool of each workspace. */
  tools: Record<WorkspaceId, ToolId>;
  view: ViewState;
  dialog: DialogId | null;
  notice?: Notice;

  setGame(game: Partial<GameState>): void;
  setRecent(recent: RecentShip[]): void;
  openDocument(input: {
    ship: Ship;
    art: ShipArt;
    origin?: ShipOrigin;
    saveTarget?: SaveTarget;
    saved: boolean;
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
  select(selection: Selection): void;
  setStationSystem(system: number | null): void;
  setSystemDrag(drag: SystemDrag | null): void;
  setArtTool(options: Partial<ArtToolOptions>): void;
  openPicturePicker(target: PictureTarget): void;
  setHoverWeapon(index: number | null): void;
  setWorkspace(workspace: WorkspaceId): void;
  setTool(tool: ToolId): void;
  setLayer(layer: LayerId, visible: boolean): void;
  setHangarPreview(on: boolean): void;
  setCamera(camera: Camera): void;
  setPanHeld(held: boolean): void;
  openDialog(dialog: DialogId | null): void;
  setNotice(notice: Notice | undefined): void;
  setLanguage(language: string): void;
  setTheme(theme: Theme): void;
  setUiScale(scale: number): void;
}

let nextDocumentId = 1;

const initialTools = (): Record<WorkspaceId, ToolId> => ({
  layout: "select",
  systems: "select",
  art: "select",
  loadout: "select",
  details: "select",
});

/** The state on start: remembered paths and recent ships, nothing open. */
export function initialEditorState() {
  const datPath = loadDatPath();
  const language = loadLanguage();
  return {
    language: language && LANGUAGES[language] ? language : DEFAULT_LANGUAGE,
    theme: loadTheme(),
    uiScale: loadUiScale(),
    game: { datPath, mod: datPath ? loadMod() : undefined, status: "none" } as GameState,
    recent: loadRecent(),
    doc: undefined,
    selection: EMPTY_SELECTION,
    stationSystem: null as number | null,
    systemDrag: null as SystemDrag | null,
    artTool: { picture: "auto", keepMounts: false, active: null } as ArtToolOptions,
    pictureTarget: null as PictureTarget | null,
    hoverWeapon: null as number | null,
    workspace: "layout" as WorkspaceId,
    tools: initialTools(),
    view: {
      layers: { ...DEFAULT_LAYERS },
      hangarPreview: false,
      camera: { x: 0, y: 0, scale: 1 },
      panHeld: false,
    },
    dialog: null,
    notice: undefined,
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

    openDocument: ({ ship, art, origin, saved, saveTarget }) => {
      const snapshot: ShipSnapshot = { ship, art };
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
        workspace: "layout",
        tools: initialTools(),
        view: { ...get().view, hangarPreview: false, panHeld: false },
        dialog: null,
      });
    },

    closeDocument: () => set({ doc: undefined, selection: EMPTY_SELECTION, dialog: null }),

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

    select: (selection) => {
      const ship = get().doc?.history.present.ship;
      set({ selection: ship ? validSelection(ship, selection) : selection });
    },
    setStationSystem: (stationSystem) => set({ stationSystem }),
    setSystemDrag: (systemDrag) => set({ systemDrag }),
    setArtTool: (options) => set({ artTool: { ...get().artTool, ...options } }),
    openPicturePicker: (pictureTarget) => set({ pictureTarget, dialog: "picture" }),
    setHoverWeapon: (hoverWeapon) => {
      if (get().hoverWeapon !== hoverWeapon) set({ hoverWeapon });
    },

    setWorkspace: (workspace) => set({ workspace }),

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
    setNotice: (notice) => set({ notice }),

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
  };
});

/** Puts the store back to its starting state (tests, and a clean start). */
export function resetEditorStore(): void {
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

/** True when the ship differs from the one last saved (or was never saved). */
export const hasUnsavedChanges = (s: EditorState): boolean => {
  const doc = s.doc;
  if (!doc) return false;
  const { present } = doc.history;
  return present.ship !== doc.saved?.ship || present.art !== doc.saved.art;
};

export const undoAvailable = (s: EditorState) => !!s.doc && canUndo(s.doc.history);
export const redoAvailable = (s: EditorState) => !!s.doc && canRedo(s.doc.history);
