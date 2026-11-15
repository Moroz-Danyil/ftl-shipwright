/**
 * What the Info panel describes: the last item clicked in a list (a weapon,
 * drone or augment, a crew race, a system), else the selection of the current
 * workspace, else the ship itself. It follows clicks and the selection, never
 * the pointer.
 */
import { lookupText, type GameTexts } from "../core";
import type { ItemKind } from "./loadout/catalog";
import {
  EMPTY_SELECTION,
  selectionSize,
  singleTarget,
  type Selection,
  type Target,
} from "./selection";
import type { WorkspaceId } from "./workspaces";

/** Something clicked in a list of the inspector, which the panel then describes. */
export type InfoPick =
  | { kind: "item"; item: ItemKind; name: string }
  | { kind: "race"; race: string }
  | { kind: "system"; system: string };

export type InfoSubject =
  | InfoPick
  | Target
  /** Several things are selected. */
  | { kind: "several"; selection: Selection }
  /** Nothing is selected: the ship itself. */
  | { kind: "ship" };

/**
 * The parts of the selection each workspace works with: Ship's canvas and
 * slot bar select rooms, doors, stations and slots; Rooms the layout; Hull
 * the mounts and gibs. The rest of the selection stays, unseen, for when its
 * workspace is opened again.
 */
const WORKSPACE_PARTS: Record<WorkspaceId, Array<keyof Selection>> = {
  ship: ["rooms", "doors", "stations", "weapons", "drones"],
  rooms: ["rooms", "doors", "stations"],
  hull: ["mounts", "gibs"],
};

/** The part of the selection the workspace shows. */
export function workspaceSelection(selection: Selection, workspace: WorkspaceId): Selection {
  const out = { ...EMPTY_SELECTION };
  for (const part of WORKSPACE_PARTS[workspace]) out[part] = selection[part];
  return out;
}

/**
 * The subject of the panel: the last item clicked in a list, else the
 * workspace's part of the selection, else the ship.
 */
export function infoSubject(
  selection: Selection,
  pick: InfoPick | null,
  workspace: WorkspaceId
): InfoSubject {
  if (pick) return pick;
  const shown = workspaceSelection(selection, workspace);
  const size = selectionSize(shown);
  if (size === 0) return { kind: "ship" };
  if (size > 1) return { kind: "several", selection: shown };
  return singleTarget(shown)!;
}

/**
 * The game's texts of what a system does at each power level, where its
 * files have them (`data/text_misc.xml`): piloting, doors, sensors, mind
 * control and artillery level by level, shields one barrier per two levels.
 * The other systems' level texts take numbers that only the game knows, so
 * they are left out.
 */
const LEVEL_TEXTS: Record<string, Array<[level: number, id: string]>> = {
  pilot: [
    [1, "pilot_1"],
    [2, "pilot_2"],
    [3, "pilot_3"],
  ],
  doors: [
    [1, "door_1"],
    [2, "door_2"],
    [3, "door_3"],
    [4, "door_4"],
  ],
  sensors: [
    [1, "sensor_1"],
    [2, "sensor_2"],
    [3, "sensor_3"],
    [4, "sensor_4"],
  ],
  shields: [
    [2, "shields_0"],
    [4, "shields_1"],
    [6, "shields_2"],
    [8, "shields_3"],
  ],
  mind: [
    [1, "mind_1"],
    [2, "mind_2"],
    [3, "mind_3"],
  ],
  artillery: [
    [1, "artillery_1"],
    [2, "artillery_2"],
    [3, "artillery_3"],
    [4, "artillery_4"],
  ],
};

/** What each power level of a system does, as far as the game's texts say; levels in order. */
export function systemLevels(
  texts: GameTexts | undefined,
  system: string
): Array<{ level: number; text: string }> {
  if (!texts || !Object.prototype.hasOwnProperty.call(LEVEL_TEXTS, system)) return [];
  return LEVEL_TEXTS[system].flatMap(([level, id]) => {
    const text = lookupText(texts, id);
    return text ? [{ level, text }] : [];
  });
}
