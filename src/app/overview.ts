/**
 * The ship overview: a checklist of everything about the ship, in sections in
 * the order of the workspaces. Each item is ok, worth a look (`check`) or a
 * problem (the game will not work or may crash). An item gathers the checks
 * of its kind, so every check lands in exactly one item.
 */
import { useMemo } from "react";
import { resolveText, type Ship } from "../core";
import { useTexts, type Texts } from "../text";
import type { ShipArt } from "./art/model";
import { allChecks, selectionOfIssue, type CheckCode, type CheckIssue } from "./checks";
import { LIMITS as SHIP_LIMITS, NEW_SHIP_HULL, crewTotal } from "./details/rules";
import { items, slots } from "./loadout/rules";
import { systemName } from "./names";
import { EMPTY_SELECTION, mergeSelections, type Selection } from "./selection";
import { useEditor, type GameData } from "./store";
import { useInteriorSizes, type PictureSize } from "./systems/interiors";
import { WORKSPACES, type WorkspaceId } from "./workspaces";
import { isPlayerShip } from "../canvas/viewLimit";

/** The items of each section, in the order they are listed. */
export const OVERVIEW_ITEMS = {
  ship: ["name", "class", "description", "saveName", "hullReactor", "crew", "slots", "knownItems"],
  rooms: [
    "rooms",
    "overlap",
    "roomIds",
    "doors",
    "reach",
    "airlocks",
    "onScreen",
    "stations",
    "systemRooms",
    "oneSystem",
    "pairs",
    "coreSystems",
    "interiors",
  ],
  hull: ["hull", "floor", "shield", "cloak", "shipIcon", "gibs", "mounts", "mountGibs"],
} as const satisfies Record<WorkspaceId, readonly string[]>;

export type OverviewItemId = (typeof OVERVIEW_ITEMS)[WorkspaceId][number];

/** The item each check belongs to. */
export const ITEM_OF_CHECK: Record<CheckCode, OverviewItemId> = {
  "no-name": "name",
  "no-class": "class",
  "no-description": "description",
  "no-hull-points": "hullReactor",
  "no-crew": "crew",
  "too-many-weapons": "slots",
  "too-many-drones": "slots",
  "unknown-weapon": "knownItems",
  "unknown-drone": "knownItems",
  "no-rooms": "rooms",
  "room-overlap": "overlap",
  "room-ids": "roomIds",
  "room-size": "roomIds",
  "door-no-room": "doors",
  "door-rooms-mismatch": "doors",
  "rooms-cut-off": "reach",
  "airlock-large-room": "airlocks",
  "rooms-off-screen": "onScreen",
  "station-outside-room": "stations",
  "system-unknown-room": "systemRooms",
  "several-installed": "oneSystem",
  "unusual-mix": "pairs",
  "missing-core-system": "coreSystems",
  "cloak-interior-size": "interiors",
  "no-hull": "hull",
  "no-shield": "shield",
  "no-ship-icon": "shipIcon",
  "gib-no-picture": "gibs",
  "few-mounts": "mounts",
  "mount-gib-missing": "mountGibs",
};

export type ItemStatus = "ok" | "check" | "problem";

/** One line of an item that needs a look: a check, with the system it is about. */
export interface ItemDetail {
  text: string;
  systemId?: string;
}

export interface OverviewItem {
  id: OverviewItemId;
  title: string;
  status: ItemStatus;
  /** A short value shown while the item is ok, e.g. "Rooms: 17". */
  value?: string;
  /** What is wrong and where to fix it, while the item is not ok. */
  explanation?: string;
  /** The rooms, doors, mounts or items involved, one line per check. */
  details: ItemDetail[];
  /** The checks of the item. */
  issues: CheckIssue[];
  /** Where to fix it: the workspace and what to select there. */
  workspace: WorkspaceId;
  selection: Selection;
}

export interface OverviewSection {
  id: WorkspaceId;
  title: string;
  items: OverviewItem[];
}

export interface OverviewInput {
  ship: Ship;
  art?: ShipArt;
  data?: Pick<GameData, "catalogs" | "texts">;
  /** The sizes of the interior pictures the ship uses, by name. */
  sizes?: Record<string, PictureSize>;
}

/** True when a check names the things it is about, so the item lists it. */
function namesSomething(issue: CheckIssue): boolean {
  return (
    issue.rooms !== undefined ||
    issue.door !== undefined ||
    issue.mount !== undefined ||
    issue.gib !== undefined ||
    issue.item !== undefined ||
    issue.systemId !== undefined
  );
}

/** The values the items show while they are ok. */
function itemValues(
  { ship, art, data }: OverviewInput,
  texts: Texts
): Partial<Record<OverviewItemId, string>> {
  const t = texts.overview.items;
  const bp = ship.blueprint;
  const text = (field: "name" | "class") => {
    const value = bp.texts[field];
    if (value?.kind === "text") return value.text;
    return (data && resolveText(data.texts, value)) || value?.id || "";
  };
  const set = (picture: unknown) =>
    picture ? texts.overview.pictureSet : texts.overview.pictureNone;
  const doors = ship.layout.doors;
  const airlocks = doors.filter((d) => d.roomA === -1 || d.roomB === -1).length;
  const weapons = items(ship, "weapon").length;
  const drones = items(ship, "drone").length;
  return {
    name: text("name"),
    class: text("class"),
    description: t.description.value,
    saveName: t.saveName.value(bp.name, bp.layout),
    hullReactor: t.hullReactor.value(
      bp.health ?? NEW_SHIP_HULL,
      bp.maxPower ?? SHIP_LIMITS.reactor.min
    ),
    crew: t.crew.value(crewTotal(ship), SHIP_LIMITS.crew),
    slots: t.slots.value(weapons, slots(ship, "weapon"), drones, slots(ship, "drone")),
    knownItems: weapons + drones > 0 ? t.knownItems.value : t.knownItems.none,
    rooms: t.rooms.value(ship.layout.rooms.length),
    doors: t.doors.value(doors.length - airlocks),
    airlocks: t.airlocks.value(airlocks),
    onScreen: isPlayerShip(bp.name) ? t.onScreen.value : t.onScreen.notPlayer,
    coreSystems: t.coreSystems.value(bp.systems.length),
    hull: set(art?.hull),
    floor: set(art?.floor),
    shield: set(art?.shield),
    cloak: set(art?.cloak),
    shipIcon: set(art?.miniship),
    gibs: t.gibs.value(ship.layoutXml.gibs.length),
    mounts: t.mounts.value(ship.layoutXml.mounts.length, slots(ship, "weapon")),
  };
}

/** The overview of a ship: its sections with their items. */
export function buildOverview(input: OverviewInput, texts: Texts): OverviewSection[] {
  const { ship, art, data, sizes = {} } = input;
  const byItem = new Map<OverviewItemId, CheckIssue[]>();
  for (const issue of allChecks(ship, sizes, art, data?.catalogs, data?.texts)) {
    const id = ITEM_OF_CHECK[issue.code];
    byItem.set(id, [...(byItem.get(id) ?? []), issue]);
  }
  const values = itemValues(input, texts);
  const detail = (issue: CheckIssue): ItemDetail => {
    const refs = issue.systemId
      ? {
          ...issue,
          systemName: systemName(
            data,
            issue.systemId,
            texts.systems.fallbackNames[issue.systemId] ??
              texts.overview.coreSystemNames[issue.systemId]
          ),
        }
      : issue;
    const text = texts.checks.messages[issue.code](refs);
    return issue.systemId ? { text, systemId: issue.systemId } : { text };
  };

  return WORKSPACES.map((workspace) => ({
    id: workspace,
    title: texts.workspaces[workspace].label,
    items: OVERVIEW_ITEMS[workspace].map((id): OverviewItem => {
      const issues = byItem.get(id) ?? [];
      const status: ItemStatus = issues.some((i) => i.severity === "problem")
        ? "problem"
        : issues.length > 0
          ? "check"
          : "ok";
      const item: OverviewItem = {
        id,
        title: texts.overview.items[id].title,
        status,
        details: issues.filter(namesSomething).map(detail),
        issues,
        workspace,
        selection: issues.reduce(
          (sel, issue) => mergeSelections(sel, selectionOfIssue(issue)),
          EMPTY_SELECTION
        ),
      };
      const value = values[id];
      if (value) item.value = value;
      if (status !== "ok") item.explanation = texts.overview.items[id].explain;
      return item;
    }),
  }));
}

/** How many items are problems and how many are worth a look. */
export function overviewCounts(sections: OverviewSection[]): { problems: number; checks: number } {
  let problems = 0;
  let checks = 0;
  for (const section of sections)
    for (const item of section.items) {
      if (item.status === "problem") problems++;
      else if (item.status === "check") checks++;
    }
  return { problems, checks };
}

/** The overview of the open ship (interior sizes are read from its pictures' source). */
export function useOverview(): OverviewSection[] {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const art = useEditor((s) => s.doc?.history.present.art);
  const data = useEditor((s) => s.game.data);
  const sizes = useInteriorSizes(art?.source, ship);
  return useMemo(
    () => (ship ? buildOverview({ ship, art, data, sizes }, texts) : []),
    [ship, art, data, sizes, texts]
  );
}
