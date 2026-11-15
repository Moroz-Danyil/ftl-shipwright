/**
 * Pictures for the hover help, drawn the way the game shows the value with
 * the ship's numbers: the hull bar, the reactor's power bars, the weapon or
 * drone box, the missiles and drone parts of the top panel (all from the
 * game's interface pictures) and the hangar texts. Without the game's
 * pictures, simple stand-ins are drawn for the bars and boxes. Topics without
 * a picture draw nothing.
 */
import { useId, type ReactNode } from "react";
import type { Rect } from "../../core";
import { gameText } from "../../app/loadout/catalog";
import { LIMITS, NEW_SHIP_HULL } from "../../app/details/rules";
import { slots } from "../../app/loadout/rules";
import { useEditor } from "../../app/store";
import { fitGameText, useGameFont } from "../../canvas/hangar/gameFont";
import { GameText } from "../../canvas/hangar/GameText";
import { HANGAR_COLOURS } from "../../canvas/hangar/hangarLayout";
import { useGameText } from "../../canvas/hangar/useGameText";
import { usePictures, type LoadedPicture } from "../../canvas/pictures";
import { useTexts, type Texts } from "../../text";
import {
  COUNTER,
  HULL_BAR,
  HUD_PICTURES,
  REACTOR,
  SLOT_BOX,
  hullCells,
  reactorBars,
  slotBox,
  slotBoxView,
} from "./helpPictures";

type Topic = keyof Texts["help"];

/** The green the game fills the hull bar and the power bars with. */
const BAR_GREEN = "#64ff64";

function HullBar({ hull }: { hull: number }) {
  return (
    <div className="hv-box hv-hull" aria-hidden="true">
      {Array.from({ length: Math.min(hull, LIMITS.hull.max) }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

function ReactorBars({ power }: { power: number }) {
  return (
    <div className="hv-box hv-reactor" aria-hidden="true">
      {Array.from({ length: power }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

function SlotBoxes({ count }: { count: number }) {
  return (
    <div className="hv-box hv-slots" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

/** A part of the game's screen drawn at its own pixel size, on the dark box. */
function GameScreen({
  view,
  testId,
  note,
  children,
}: {
  view: Rect;
  testId: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="hv-box hv-game" data-testid={testId}>
      <svg
        width={view.w}
        height={view.h}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        aria-hidden="true"
      >
        {children}
      </svg>
      {note && <span className="hv-note">{note}</span>}
    </div>
  );
}

function Picture({ picture, x = 0, y = 0 }: { picture: LoadedPicture; x?: number; y?: number }) {
  return <image href={picture.url} x={x} y={y} width={picture.width} height={picture.height} />;
}

/** An id for SVG references, without the characters `url(#…)` cannot take. */
function useSvgId(): string {
  return `hv${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function GameHullBar({ hull }: { hull: number }) {
  const texts = useTexts();
  const view = useEditor((s) => s.game.data?.view);
  const label = useGameText("status_hull");
  const mask = useSvgId();
  const pictures = usePictures(view, [
    HUD_PICTURES.hull,
    HUD_PICTURES.hullMask,
    HUD_PICTURES.hullLabel,
  ]);
  if (pictures === "loading") return null;
  if (pictures === "missing") return <HullBar hull={hull} />;
  const [frame, cells, tab] = pictures;
  const filled = hullCells(hull);
  return (
    <GameScreen
      view={HULL_BAR.view}
      testId="hv-game-hull"
      note={hull > HULL_BAR.cells ? texts.helpPictures.hullFull(hull) : undefined}
    >
      <mask id={mask}>
        <Picture picture={cells} x={HULL_BAR.maskX} />
      </mask>
      <Picture picture={frame} />
      <rect
        className="hv-hull-fill"
        data-cells={filled}
        x={HULL_BAR.maskX}
        y={0}
        width={filled * HULL_BAR.pitch}
        height={cells.height}
        fill={BAR_GREEN}
        mask={`url(#${mask})`}
      />
      <Picture picture={tab} />
      <GameText
        text={label}
        font="HL2"
        scale={1}
        colour={HANGAR_COLOURS.dark}
        x={HULL_BAR.label.x}
        y={HULL_BAR.label.y}
        middle
      />
    </GameScreen>
  );
}

function GameReactor({ power }: { power: number }) {
  const texts = useTexts();
  const view = useEditor((s) => s.game.data?.view);
  const pictures = usePictures(view, [HUD_PICTURES.reactor]);
  if (pictures === "loading") return null;
  if (pictures === "missing") return <ReactorBars power={power} />;
  return (
    <GameScreen
      view={REACTOR.view}
      testId="hv-game-reactor"
      note={power > REACTOR.maxBars ? texts.helpPictures.reactorFull(power) : undefined}
    >
      <Picture picture={pictures[0]} />
      {reactorBars(power).map((bar, i) => (
        <rect
          key={i}
          className="hv-power"
          x={bar.x}
          y={bar.y}
          width={bar.w}
          height={bar.h}
          fill={BAR_GREEN}
        />
      ))}
    </GameScreen>
  );
}

function GameSlotBox({ count, kind }: { count: number; kind: "weapon" | "drone" }) {
  const texts = useTexts();
  const view = useEditor((s) => s.game.data?.view);
  const label = useGameText(kind === "weapon" ? "weapons_label" : "drones_label");
  const font = useGameFont(view, "HL1");
  const box = slotBox(count);
  const pictures = usePictures(view, [box.path, HUD_PICTURES.boxLabel]);
  if (pictures === "loading") return null;
  if (pictures === "missing") return <SlotBoxes count={count} />;
  const [frame, tab] = pictures;
  const layout = font && label ? fitGameText(font, label, 1) : undefined;
  const textWidth = layout ? layout.inkRight - layout.inkLeft : label.length * 6;
  const tabX = SLOT_BOX.label.x + textWidth + 4 - SLOT_BOX.tabOverlap;
  return (
    <GameScreen
      view={slotBoxView(frame.width)}
      testId={`hv-game-${kind}-box`}
      note={box.exact ? undefined : texts.helpPictures.nearestBox(count, box.slots)}
    >
      <Picture picture={frame} />
      <rect
        x={SLOT_BOX.band.x}
        y={SLOT_BOX.band.y}
        width={tabX - SLOT_BOX.band.x + 1}
        height={SLOT_BOX.band.h}
        fill={HANGAR_COLOURS.light}
      />
      <Picture picture={tab} x={tabX} y={SLOT_BOX.band.y} />
      <GameText
        text={label}
        font="HL1"
        scale={1}
        colour={HANGAR_COLOURS.dark}
        x={SLOT_BOX.label.x}
        y={SLOT_BOX.label.y}
        middle
      />
    </GameScreen>
  );
}

/** A count of the top panel: the game's icon box with the number in it. */
function GameCounter({ path, value, testId }: { path: string; value: number; testId: string }) {
  const view = useEditor((s) => s.game.data?.view);
  const pictures = usePictures(view, [path]);
  if (pictures === "loading" || pictures === "missing") return null;
  return (
    <GameScreen view={COUNTER.view} testId={testId}>
      <Picture picture={pictures[0]} />
      <GameText
        text={String(value)}
        font="HL2"
        scale={2}
        colour={HANGAR_COLOURS.white}
        x={COUNTER.number.x}
        y={COUNTER.number.y}
        maxWidth={COUNTER.number.maxWidth}
        centred
        middle
      />
    </GameScreen>
  );
}

/** The game's fuel icon on its light tab, for the line under the stats; nothing without it. */
export function FuelIcon() {
  const view = useEditor((s) => s.game.data?.view);
  const pictures = usePictures(view, [HUD_PICTURES.fuel]);
  if (pictures === "loading" || pictures === "missing") return null;
  const { x, y, w, h } = COUNTER.icon;
  return (
    <svg
      className="hv-fuel"
      data-testid="fuel-icon"
      width={w}
      height={h}
      viewBox={`${x} ${y} ${w} ${h}`}
      aria-hidden="true"
    >
      <Picture picture={pictures[0]} />
    </svg>
  );
}

function HangarCard({ topic }: { topic: Topic }) {
  const data = useEditor((s) => s.game.data);
  const texts = useEditor((s) => s.doc?.history.present.ship.blueprint.texts);
  if (!texts) return null;
  const mark = (t: Topic) => (t === topic ? "hv-mark" : undefined);
  return (
    <div className="hv-box hv-hangar" aria-hidden="true">
      <span className={mark("shipName")}>{gameText(data, texts.name)}</span>
      <span className={mark("shipClass")}>{gameText(data, texts.class)}</span>
      <span className={mark("shipDescription")}>{gameText(data, texts.desc)}</span>
    </div>
  );
}

export function HelpVisual({ topic }: { topic: Topic }) {
  const ship = useEditor((s) => s.doc?.history.present.ship);
  if (!ship) return null;
  const bp = ship.blueprint;
  switch (topic) {
    case "hull":
      return <GameHullBar hull={bp.health ?? NEW_SHIP_HULL} />;
    case "reactor":
      return <GameReactor power={bp.maxPower ?? LIMITS.reactor.min} />;
    case "weaponSlots":
      return <GameSlotBox kind="weapon" count={slots(ship, "weapon")} />;
    case "droneSlots":
      return <GameSlotBox kind="drone" count={slots(ship, "drone")} />;
    case "missiles":
      return (
        <GameCounter
          path={HUD_PICTURES.missiles}
          value={bp.weaponList?.missiles ?? 0}
          testId="hv-game-missiles"
        />
      );
    case "droneParts":
      return (
        <GameCounter
          path={HUD_PICTURES.droneParts}
          value={bp.droneList?.drones ?? 0}
          testId="hv-game-drone-parts"
        />
      );
    case "shipName":
    case "shipClass":
    case "shipDescription":
      return <HangarCard topic={topic} />;
    default:
      return null;
  }
}
