/**
 * Where a click in the Overview leads: for every item the inspector section
 * and the field in it that the item is about, and what going there does
 * (workspace, section, selection, the flash and the notice with the item's
 * text).
 */
import type { CheckIssue } from "./checks";
import type { OverviewItem, OverviewItemId } from "./overview";
import { selectionSize } from "./selection";
import { ROOM_SYSTEMS_SECTION, useEditor } from "./store";

/**
 * The place of an item in the inspector: a section to unfold and, inside it
 * (or elsewhere in the editor, such as a tool), the element with this
 * `data-field`. When the field is not on screen (e.g. a room's fields while
 * several rooms are selected), the section flashes instead.
 */
export interface OverviewTarget {
  section?: string;
  field?: string;
}

/** The `data-field` of a picture's row in Hull's Pictures section. */
export const pictureField = (slot: string) => `picture:${slot}`;
/** The `data-field` of a system's tile in the palette. */
export const systemTileField = (system: string) => `system:${system}`;
/** The `data-field` of a system's crew station in its card. */
export const stationField = (system: string) => `station:${system}`;
/** The `data-field` of a system's interior picture in its card. */
export const interiorField = (system: string) => `interior:${system}`;
/** The `data-field` of an equipped weapon or drone in its list. */
export const equippedField = (kind: string, index: number) => `${kind}:${index}`;
/** The `data-field` of a tool's button in the tool bar. */
export const toolField = (tool: string) => `tool:${tool}`;
/** The `data-field` of the warning about an unusual pair of systems. */
export const UNUSUAL_MIX_FIELD = "unusualMix";

type TargetRule = OverviewTarget | ((issues: CheckIssue[]) => OverviewTarget);

const systemOf = (issues: CheckIssue[]) => issues.find((i) => i.systemId)?.systemId ?? "";

/** The target of every item of the Overview. */
export const OVERVIEW_TARGETS: Record<OverviewItemId, TargetRule> = {
  name: { section: "ship-info", field: "shipName" },
  class: { section: "ship-info", field: "shipClass" },
  description: { section: "ship-info", field: "shipDescription" },
  saveName: { section: "ship-info", field: "blueprintName" },
  hangar: { section: "ship-info", field: "hangarSlot" },
  hullReactor: { section: "ship-stats", field: "hull" },
  crew: { section: "ship-crew" },
  slots: (issues) =>
    issues.some((i) => i.code === "too-many-weapons")
      ? { section: "ship-stats", field: "weaponSlots" }
      : { section: "ship-stats", field: "droneSlots" },
  knownItems: (issues) => {
    const weapon = issues.find((i) => i.weapon !== undefined)?.weapon;
    if (weapon !== undefined)
      return { section: "ship-weapons", field: equippedField("weapon", weapon) };
    const drone = issues.find((i) => i.drone !== undefined)?.drone;
    return { section: "ship-drones", field: equippedField("drone", drone ?? 0) };
  },
  rooms: { field: toolField("room") },
  overlap: { section: "room-position", field: "roomPosition" },
  roomIds: { section: "room-position", field: "roomSize" },
  doors: {},
  reach: {},
  airlocks: {},
  onScreen: { section: "room-position", field: "roomPosition" },
  stations: (issues) => ({ section: ROOM_SYSTEMS_SECTION, field: stationField(systemOf(issues)) }),
  systemRooms: (issues) => ({ section: "rooms-palette", field: systemTileField(systemOf(issues)) }),
  oneSystem: { section: ROOM_SYSTEMS_SECTION },
  pairs: { section: ROOM_SYSTEMS_SECTION, field: UNUSUAL_MIX_FIELD },
  coreSystems: (issues) => ({
    section: "rooms-palette",
    field: systemTileField(systemOf(issues)),
  }),
  interiors: (issues) => ({
    section: ROOM_SYSTEMS_SECTION,
    field: interiorField(systemOf(issues)),
  }),
  hull: { section: "art-pictures", field: pictureField("hull") },
  floor: { section: "art-pictures", field: pictureField("floor") },
  shield: { section: "art-pictures", field: pictureField("shield") },
  cloak: { section: "art-pictures", field: pictureField("cloak") },
  shipIcon: { section: "art-pictures", field: pictureField("miniship") },
  gibs: { section: "art-gibs", field: "gibPicture" },
  mounts: { section: "art-mounts" },
  mountGibs: { section: "art-mounts", field: "mountGib" },
};

/** Where an item leads in the inspector. */
export function overviewTarget(item: Pick<OverviewItem, "id" | "issues">): OverviewTarget {
  const rule = OVERVIEW_TARGETS[item.id];
  return typeof rule === "function" ? rule(item.issues) : rule;
}

/**
 * Goes to where an item is fixed: opens its workspace, selects its objects
 * (with the Select tool, and without the hangar preview over them),
 * unfolds its section, flashes the field and the objects, and shows what is
 * wrong and what to do in the notice.
 */
export function goToOverviewItem(item: OverviewItem): void {
  const target = overviewTarget(item);
  const state = useEditor.getState();
  state.setWorkspace(item.workspace);
  const objects = item.selection;
  // The hangar preview covers the inspector and the canvas.
  state.setHangarPreview(false);
  if (selectionSize(objects) > 0) state.setTool("select");
  state.select(objects);
  if (target.section) state.setSectionOpen(target.section, true);
  if (item.status !== "ok")
    state.setNotice({
      kind: "issue",
      status: item.status,
      title: item.title,
      text: item.explanation ?? "",
      details: item.details.map((d) => d.text),
    });
  // The objects as selected: those that still exist.
  const shown = useEditor.getState().selection;
  state.startFlash({ field: target.field, section: target.section, objects: shown });
}
