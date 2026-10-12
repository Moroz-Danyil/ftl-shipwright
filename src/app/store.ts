/**
 * The one store of the app: game data, the open ship with its undo history,
 * the selection, the workspace and tool, and the view settings.
 */
import { create } from "zustand";
import type {
  Animations,
  Catalogs,
  FileSource,
  GameTexts,
  GameView,
  Ship,
  ShipPicturePaths,
} from "../core";
import type { ModRef } from "../platform/types";
import { canRedo, canUndo, createHistory, record, redo, undo, type History } from "./history";
import { EMPTY_SELECTION, validSelection, type Selection } from "./selection";
import { loadDatPath, loadMod, loadRecent, type RecentShip, type ShipOrigin } from "./settings";
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

/** Where the open ship's pictures are read from. */
export interface ShipPictureRefs {
  source: FileSource;
  paths: ShipPicturePaths;
}

export type SaveTarget = { kind: "ftl"; path: string } | { kind: "folder"; path: string };

export interface ShipDocument {
  /** Changes every time a ship is opened, so views can reset (e.g. fit the ship). */
  id: number;
  history: History<Ship>;
  /** The ship as it was last saved or opened; absent for a ship never saved. */
  saved?: Ship;
  pictures: ShipPictureRefs;
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

export type DialogId = "newShip" | "openShip" | "save" | "checks";

export interface Notice {
  kind: "error" | "info";
  text: string;
}

// ---------------------------------------------------------------------------

export interface EditorState {
  language: string;
  game: GameState;
  recent: RecentShip[];
  doc?: ShipDocument;
  selection: Selection;
  /** The system whose station the Station tool places (index in the blueprint). */
  stationSystem: number | null;
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
    pictures: ShipPictureRefs;
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
  undo(): void;
  redo(): void;
  /** Records that this ship (the present one, or an earlier state) was saved to the target. */
  markSaved(ship: Ship, target: SaveTarget, origin: ShipOrigin): void;
  select(selection: Selection): void;
  setStationSystem(system: number | null): void;
  setWorkspace(workspace: WorkspaceId): void;
  setTool(tool: ToolId): void;
  setLayer(layer: LayerId, visible: boolean): void;
  setHangarPreview(on: boolean): void;
  setCamera(camera: Camera): void;
  setPanHeld(held: boolean): void;
  openDialog(dialog: DialogId | null): void;
  setNotice(notice: Notice | undefined): void;
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
  return {
    language: "en",
    game: { datPath, mod: datPath ? loadMod() : undefined, status: "none" } as GameState,
    recent: loadRecent(),
    doc: undefined,
    selection: EMPTY_SELECTION,
    stationSystem: null as number | null,
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
  const changeHistory = (change: (h: History<Ship>) => History<Ship>, next?: Selection) => {
    const { doc, selection } = get();
    if (!doc) return;
    const history = change(doc.history);
    if (history === doc.history) {
      if (next) set({ selection: validSelection(history.present, next) });
      return;
    }
    set({
      doc: { ...doc, history },
      selection: validSelection(history.present, next ?? selection),
    });
  };

  return {
    ...initialEditorState(),

    setGame: (game) => set({ game: { ...get().game, ...game } }),
    setRecent: (recent) => set({ recent }),

    openDocument: ({ ship, pictures, origin, saved, saveTarget }) =>
      set({
        doc: {
          id: nextDocumentId++,
          history: createHistory(ship),
          saved: saved ? ship : undefined,
          pictures,
          origin,
          saveTarget,
        },
        selection: EMPTY_SELECTION,
        stationSystem: null,
        workspace: "layout",
        tools: initialTools(),
        view: { ...get().view, hangarPreview: false, panHeld: false },
        dialog: null,
      }),

    closeDocument: () => set({ doc: undefined, selection: EMPTY_SELECTION, dialog: null }),

    edit: (change, selection) => changeHistory((h) => record(h, change(h.present)), selection),
    undo: () => changeHistory(undo),
    redo: () => changeHistory(redo),

    markSaved: (ship, target, origin) => {
      const doc = get().doc;
      if (doc) set({ doc: { ...doc, saved: ship, saveTarget: target, origin } });
    },

    select: (selection) => {
      const ship = get().doc?.history.present;
      set({ selection: ship ? validSelection(ship, selection) : selection });
    },
    setStationSystem: (stationSystem) => set({ stationSystem }),

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
  };
});

/** Puts the store back to its starting state (tests, and a clean start). */
export function resetEditorStore(): void {
  useEditor.setState(initialEditorState());
}

// ---------------------------------------------------------------------------
// Selectors

export const currentShip = (s: EditorState): Ship | undefined => s.doc?.history.present;

export const currentTool = (s: EditorState): ToolId => {
  const tool = s.tools[s.workspace];
  return WORKSPACE_TOOLS[s.workspace].includes(tool) ? tool : "select";
};

/** True when the ship differs from the one last saved (or was never saved). */
export const hasUnsavedChanges = (s: EditorState): boolean =>
  !!s.doc && s.doc.history.present !== s.doc.saved;

export const undoAvailable = (s: EditorState) => !!s.doc && canUndo(s.doc.history);
export const redoAvailable = (s: EditorState) => !!s.doc && canRedo(s.doc.history);
