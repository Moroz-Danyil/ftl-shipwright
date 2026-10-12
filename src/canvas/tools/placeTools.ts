/**
 * The tools that add things: Room (drag a rectangle of cells), Door (click a
 * wall) and Station (click a cell of a room with a station system).
 */
import { pxToCell, roomAtCell, type Point } from "../../core";
import { addDoorAt, addRoomAt, placeStationAt } from "../../app/layoutActions";
import { doorAt, nearestWall } from "../../app/layout/doors";
import { placementProblem, rectFromCells } from "../../app/layout/rooms";
import { stationCellAt, stationSystemsInRoom } from "../../app/layout/stations";
import { useEditor } from "../../app/store";
import type { CanvasTool, ToolContext } from "./types";

const ship = () => useEditor.getState().doc?.history.present;

export function createRoomTool(context: ToolContext): CanvasTool {
  let start: Point | null = null;
  let end: Point | null = null;

  const show = (a: Point, b: Point) => {
    const s = ship();
    if (!s) return;
    const rect = rectFromCells(a, b);
    context.setOverlay({
      kind: "ghost",
      cells: [rect],
      ok: !placementProblem(s.layout.rooms, [rect]),
    });
  };
  const stop = () => {
    start = null;
    end = null;
    context.setOverlay(null);
    context.setGesture(null);
  };

  return {
    down({ p }) {
      const s = ship();
      if (!s) return;
      start = pxToCell(s.layout, p.x, p.y);
      end = start;
      show(start, end);
      context.setGesture(stop);
    },
    move({ p }) {
      const s = ship();
      if (!s) return;
      const cell = pxToCell(s.layout, p.x, p.y);
      if (start) end = cell;
      show(start ?? cell, cell);
    },
    up() {
      const a = start;
      const b = end;
      stop();
      if (a && b) addRoomAt(rectFromCells(a, b));
    },
    leave() {
      if (!start) context.setOverlay(null);
    },
    cancel: stop,
  };
}

export function createDoorTool(context: ToolContext): CanvasTool {
  return {
    down({ p }) {
      const s = ship();
      const wall = s && nearestWall(s.layout, p);
      if (wall) addDoorAt(wall);
    },
    move({ p }) {
      const s = ship();
      const wall = s && nearestWall(s.layout, p);
      context.setOverlay(
        wall ? { kind: "wall", wall, exists: doorAt(s.layout, wall) !== -1 } : null
      );
    },
    up() {},
    leave: () => context.setOverlay(null),
    cancel() {},
  };
}

/** The system whose station a click in this room places: the chosen one when it is here, else the room's first. */
export function stationSystemFor(roomSystems: number[], chosen: number | null): number | undefined {
  if (chosen !== null && roomSystems.includes(chosen)) return chosen;
  return roomSystems[0];
}

export function createStationTool(context: ToolContext): CanvasTool {
  const cellUnder = (p: Point) => {
    const s = ship();
    if (!s) return undefined;
    const cell = pxToCell(s.layout, p.x, p.y);
    const room = roomAtCell(s.layout, cell.x, cell.y);
    const systems = room ? stationSystemsInRoom(s, room.id) : [];
    return { cell, room, systems };
  };
  return {
    down({ p }) {
      const under = cellUnder(p);
      if (!under?.room) return;
      const system = stationSystemFor(under.systems, useEditor.getState().stationSystem);
      if (system === undefined) {
        context.say(context.texts.layout.noStationSystem);
        return;
      }
      useEditor.getState().setStationSystem(system);
      placeStationAt(system, stationCellAt(under.room, under.cell)!);
    },
    move({ p }) {
      const under = cellUnder(p);
      context.setOverlay(
        under?.room ? { kind: "cell", cell: under.cell, ok: under.systems.length > 0 } : null
      );
    },
    up() {},
    leave: () => context.setOverlay(null),
    cancel() {},
  };
}
