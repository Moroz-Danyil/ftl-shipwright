/**
 * The equipment panel at the bottom of the hangar: the crew as cards (the
 * race's picture, the race's title as the name, since the game gives crew
 * random names), the weapons and drones in their slots with their pictures
 * and short titles ("system not installed" without their system), and the
 * augments in their boxes. Frame titles come from the game's texts.
 */
import { raceWalkDownFrame, weaponRestingFrame, type Rect, type Ship } from "../../core";
import {
  dronePicturePaths,
  findItem,
  gameText,
  itemShortName,
  itemTitle,
} from "../../app/loadout/catalog";
import { items, slots, type LoadoutKind } from "../../app/loadout/rules";
import { useEditor } from "../../app/store";
import { isInstalled } from "../../app/systems/rules";
import { useTexts } from "../../text";
import { crewMembers } from "../gameLook";
import { usePicture } from "../pictures";
import { SheetSprite } from "../SheetSprite";
import {
  AUGMENT_BOXES,
  CREW_CARDS,
  EQUIPMENT,
  HANGAR_BOXES,
  HANGAR_PICTURES,
  ITEM_SLOT,
  ITEM_SLOTS_Y,
  crewCardAt,
  itemSlotsX,
} from "./hangarLayout";
import { ScreenPicture } from "./ScreenPicture";
import { useGameText } from "./useGameText";

/** True when the ship has the system installed at the start. */
function hasSystem(ship: Ship, system: string): boolean {
  return ship.blueprint.systems.some((s) => s.system === system && isInstalled(s));
}

/** The scale that fits a `w` × `h` picture in a box, never enlarging it. */
function fitScale(w: number, h: number, box: { w: number; h: number }): number {
  return Math.min(1, box.w / Math.max(1, w), box.h / Math.max(1, h));
}

function CrewCard({ race, index }: { race: string | undefined; index: number }) {
  const data = useEditor((s) => s.game.data);
  const customize = useGameText("crewbox_customize");
  const at = crewCardAt(index);
  if (race === undefined) return <ScreenPicture path={HANGAR_PICTURES.crewOff} x={at.x} y={at.y} />;
  const title = gameText(data, data?.catalogs.races.find((r) => r.name === race)?.title) || race;
  const frame =
    (data && raceWalkDownFrame(data.animations, race)) ??
    (data && raceWalkDownFrame(data.animations, "human"));
  const middle = at.x + CREW_CARDS.width / 2;
  return (
    <g data-testid={`hangar-crew-${index + 1}`} data-race={race}>
      <ScreenPicture path={HANGAR_PICTURES.crewOn} x={at.x} y={at.y} />
      {frame && (
        <SheetSprite
          path={frame.path}
          frame={frame.rect}
          transform={`translate(${middle} ${at.y + CREW_CARDS.pictureMiddle}) scale(${CREW_CARDS.crewScale}) translate(${-frame.rect.w / 2} ${-frame.rect.h / 2})`}
        />
      )}
      <text className="hg-text hg-text--small" x={middle} y={at.y + CREW_CARDS.nameY}>
        {title}
      </text>
      <ScreenPicture path={HANGAR_PICTURES.customize} x={at.x} y={at.y + CREW_CARDS.buttonY} />
      <text className="hg-text hg-text--tiny" x={middle} y={at.y + CREW_CARDS.buttonY + 12}>
        {customize}
      </text>
    </g>
  );
}

function Crew({ ship }: { ship: Ship }) {
  const texts = useTexts();
  const members = crewMembers(ship);
  const more = members.length - CREW_CARDS.count;
  return (
    <g data-testid="hangar-crew">
      {Array.from({ length: CREW_CARDS.count }, (_, i) => (
        <CrewCard key={i} race={members[i]} index={i} />
      ))}
      {more > 0 && (
        <text
          className="hg-text hg-text--small"
          data-testid="hangar-more-crew"
          x={CREW_CARDS.x + CREW_CARDS.columnPitch + CREW_CARDS.width + 20}
          y={CREW_CARDS.y + CREW_CARDS.rowPitch * 2 - 12}
        >
          {texts.canvas.hangarMoreCrew(more)}
        </text>
      )}
    </g>
  );
}

/** A weapon's resting frame, laid on its side as the slot shows it, centred on `(cx, cy)`. */
function WeaponInSlot({ name, cx, cy }: { name: string; cx: number; cy: number }) {
  const data = useEditor((s) => s.game.data);
  const item = findItem(data, "weapon", name);
  const art = item?.kind === "weapon" ? item.entry.weaponArt : undefined;
  const frame = data && art ? weaponRestingFrame(data.animations, art) : undefined;
  const picture = usePicture(data?.view, frame?.path);
  if (!frame || !picture) return null;
  const { rect } = frame;
  // Turned: the frame's height becomes the width on screen.
  const scale = fitScale(rect.h, rect.w, ITEM_SLOT.picture);
  const w = rect.h * scale;
  const h = rect.w * scale;
  return (
    <g
      transform={`translate(${Math.round(cx - w / 2)} ${Math.round(cy - h / 2)}) scale(${scale}) matrix(0 -1 -1 0 ${rect.h} ${rect.w})`}
    >
      <svg width={rect.w} height={rect.h} viewBox={`${rect.x} ${rect.y} ${rect.w} ${rect.h}`}>
        <image href={picture.url} width={picture.width} height={picture.height} />
      </svg>
    </g>
  );
}

/** A drone's `_base` picture, else its `_off` picture, centred on `(cx, cy)`. */
function DroneInSlot({ name, cx, cy }: { name: string; cx: number; cy: number }) {
  const data = useEditor((s) => s.game.data);
  const item = findItem(data, "drone", name);
  const [base, off] = item?.kind === "drone" ? dronePicturePaths(item.entry) : [];
  const first = usePicture(data?.view, base);
  const second = usePicture(data?.view, off);
  const picture = first ?? second;
  if (!picture) return null;
  const scale = fitScale(picture.width, picture.height, ITEM_SLOT.picture);
  const w = picture.width * scale;
  const h = picture.height * scale;
  return (
    <image
      href={picture.url}
      x={Math.round(cx - w / 2)}
      y={Math.round(cy - h / 2)}
      width={w}
      height={h}
    />
  );
}

function ItemSlot({
  kind,
  name,
  x,
  y,
}: {
  kind: LoadoutKind;
  name?: string;
  x: number;
  y: number;
}) {
  const data = useEditor((s) => s.game.data);
  const on = kind === "weapon" ? HANGAR_PICTURES.weaponOn : HANGAR_PICTURES.droneOn;
  const off = kind === "weapon" ? HANGAR_PICTURES.weaponOff : HANGAR_PICTURES.droneOff;
  if (!name) return <ScreenPicture path={off} x={x} y={y} />;
  const item = findItem(data, kind, name);
  const label = item ? itemShortName(data, item) : name;
  const cx = x + ITEM_SLOT.picture.x;
  const cy = y + ITEM_SLOT.picture.y;
  return (
    <g data-testid={`hangar-${kind}-${name}`}>
      <ScreenPicture path={on} x={x} y={y} />
      {kind === "weapon" ? (
        <WeaponInSlot name={name} cx={cx} cy={cy} />
      ) : (
        <DroneInSlot name={name} cx={cx} cy={cy} />
      )}
      <text className="hg-text hg-text--small" x={x + ITEM_SLOT.picture.x} y={y + ITEM_SLOT.nameY}>
        {label}
      </text>
    </g>
  );
}

function NotInstalled({ pane, kind }: { pane: Rect; kind: LoadoutKind }) {
  const text = useGameText("equipment_no_system");
  return (
    <text
      className="hg-text hg-text--big"
      data-testid={`hangar-${kind}-not-installed`}
      x={pane.x + pane.w / 2}
      y={pane.y + pane.h / 2}
    >
      {text}
    </text>
  );
}

function Slots({ ship, kind }: { ship: Ship; kind: LoadoutKind }) {
  const pane = kind === "weapon" ? EQUIPMENT.weaponsPane : EQUIPMENT.dronesPane;
  if (!hasSystem(ship, kind === "weapon" ? "weapons" : "drones"))
    return <NotInstalled pane={pane} kind={kind} />;
  const list = items(ship, kind);
  const xs = itemSlotsX(Math.max(slots(ship, kind), list.length), pane);
  return (
    <g data-testid={`hangar-${kind}-slots`} data-slots={xs.length}>
      {xs.map((x, i) => (
        <ItemSlot key={i} kind={kind} name={list[i]} x={x} y={ITEM_SLOTS_Y[kind]} />
      ))}
    </g>
  );
}

function Augments({ ship }: { ship: Ship }) {
  const data = useEditor((s) => s.game.data);
  const augments = ship.blueprint.augments;
  return (
    <g data-testid="hangar-augments">
      {Array.from({ length: Math.max(AUGMENT_BOXES.count, augments.length) }, (_, i) => {
        const y = AUGMENT_BOXES.y + i * AUGMENT_BOXES.pitch;
        const name = augments[i];
        if (!name)
          return (
            <ScreenPicture key={i} path={HANGAR_PICTURES.augmentOff} x={AUGMENT_BOXES.x} y={y} />
          );
        const item = findItem(data, "augment", name);
        return (
          <g key={i} data-testid={`hangar-augment-${name}`}>
            <ScreenPicture path={HANGAR_PICTURES.augmentOn} x={AUGMENT_BOXES.x} y={y} />
            <text
              className="hg-text hg-text--small"
              x={AUGMENT_BOXES.x + AUGMENT_BOXES.width / 2}
              y={y + AUGMENT_BOXES.height / 2}
            >
              {item ? itemTitle(data, item) : name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function EquipmentPanel() {
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const crew = useGameText("hangar_frame_crew");
  const weapons = useGameText("equipment_frame_weapons");
  const drones = useGameText("equipment_frame_drones");
  const augments = useGameText("equipment_frame_augments");
  if (!ship) return null;
  const { x, y } = HANGAR_BOXES.equipment;
  const title = (text: string, tx: number, ty: number) => (
    <text className="hg-text hg-text--title" x={tx} y={ty}>
      {text}
    </text>
  );
  return (
    <g data-testid="hangar-equipment">
      <ScreenPicture path={HANGAR_PICTURES.equipment} x={x} y={y} />
      {title(crew, EQUIPMENT.crewTitleX, EQUIPMENT.titleY)}
      {title(weapons, EQUIPMENT.weaponsTitleX, EQUIPMENT.titleY)}
      {title(drones, EQUIPMENT.weaponsTitleX, EQUIPMENT.dronesTitleY)}
      {title(augments, EQUIPMENT.augmentsTitleX, EQUIPMENT.titleY)}
      <Crew ship={ship} />
      <Slots ship={ship} kind="weapon" />
      <Slots ship={ship} kind="drone" />
      <Augments ship={ship} />
    </g>
  );
}
