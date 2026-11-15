/**
 * The hangar's other boxes, drawn only for the look: the ship and layout
 * box with its arrows and buttons, the achievements box, the Start box with
 * the difficulties and the Advanced Edition box. Their texts are the game's
 * own, in its fonts; the layout button of the ship's own layout is chosen,
 * as are Easy and Advanced Edition. Nothing here does anything.
 */
import { slotOf } from "../../app/hangar";
import { useEditor } from "../../app/store";
import { GameText } from "./GameText";
import { HangarButton } from "./HangarButton";
import {
  HANGAR_BOXES,
  HANGAR_BUTTONS,
  HANGAR_COLOURS,
  HANGAR_PICTURES,
  HANGAR_TEXTS,
  type HangarButtonRect,
} from "./hangarLayout";
import { ScreenPicture } from "./ScreenPicture";
import { useGameText } from "./useGameText";

/** A frame title: dark, `HL2` at twice its size, by its left edge and baseline. */
export function FrameTitle({ text, x, y }: { text: string; x: number; y: number }) {
  return <GameText text={text} font="HL2" scale={2} colour={HANGAR_COLOURS.dark} x={x} y={y} />;
}

function Button({
  textKey,
  rect,
  scale,
  chosen,
}: {
  textKey: string;
  rect: HangarButtonRect;
  scale?: number;
  chosen?: boolean;
}) {
  return <HangarButton rect={rect} label={useGameText(textKey)} scale={scale} chosen={chosen} />;
}

const LAYOUT_KEYS = ["typebutton_a", "typebutton_b", "typebutton_c"] as const;

function ShipSelect() {
  const { x, y } = HANGAR_BOXES.shipSelect;
  const name = useEditor((s) => s.doc?.history.present.ship.blueprint.name);
  const ship = useGameText("hangar_frame_ship");
  const layout = useGameText("hangar_frame_layout");
  const chosenLayout = (name && slotOf(name)?.layout) ?? 0;
  const { layoutA, layoutPitch } = HANGAR_BUTTONS;
  return (
    <g>
      <ScreenPicture path={HANGAR_PICTURES.shipSelect} x={x} y={y} />
      <FrameTitle text={ship} {...HANGAR_TEXTS.shipTitle} />
      <ScreenPicture path={HANGAR_PICTURES.arrow} x={x + 32} y={y + 38} />
      <ScreenPicture path={HANGAR_PICTURES.arrow} x={x + 126} y={y + 38} mirror />
      <Button textKey="ship_list_button" rect={HANGAR_BUTTONS.list} />
      <Button textKey="ship_random_button" rect={HANGAR_BUTTONS.randomShip} />
      <FrameTitle text={layout} {...HANGAR_TEXTS.layoutTitle} />
      {LAYOUT_KEYS.map((key, i) => (
        <Button
          key={key}
          textKey={key}
          rect={{ ...layoutA, x: layoutA.x + i * layoutPitch }}
          scale={3}
          chosen={i === chosenLayout}
        />
      ))}
      <Button textKey="ship_hiderooms_button" rect={HANGAR_BUTTONS.hideRooms} />
    </g>
  );
}

function Achievements() {
  const { x, y } = HANGAR_BOXES.achievements;
  const title = useGameText("hangar_achievements_title");
  return (
    <g>
      <ScreenPicture path={HANGAR_PICTURES.achievements} x={x} y={y} />
      <GameText
        text={title}
        font="JustinFont12Bold"
        scale={1}
        colour={HANGAR_COLOURS.light}
        {...HANGAR_TEXTS.achievementsTitle}
      />
    </g>
  );
}

function Start() {
  const { x, y } = HANGAR_BOXES.start;
  return (
    <g>
      <ScreenPicture path={HANGAR_PICTURES.start} x={x} y={y} />
      <Button textKey="easy_button" rect={HANGAR_BUTTONS.easy} chosen />
      <Button textKey="normal_button" rect={HANGAR_BUTTONS.normal} />
      <Button textKey="hard_button" rect={HANGAR_BUTTONS.hard} />
      <Button textKey="start_button" rect={HANGAR_BUTTONS.start} scale={4} />
    </g>
  );
}

function Advanced() {
  const { x, y } = HANGAR_BOXES.advanced;
  const title = useGameText("hangar_advanced_title");
  return (
    <g>
      <ScreenPicture path={HANGAR_PICTURES.advanced} x={x} y={y} />
      <GameText
        text={title}
        font="JustinFont12Bold"
        scale={1}
        colour={HANGAR_COLOURS.light}
        centred
        {...HANGAR_TEXTS.advancedTitle}
      />
      <Button textKey="advanced_off_button" rect={HANGAR_BUTTONS.advancedOff} />
      <Button textKey="advanced_on_button" rect={HANGAR_BUTTONS.advancedOn} chosen />
    </g>
  );
}

export function HangarDecorations() {
  return (
    <g className="hg-decorations" aria-hidden="true">
      <ShipSelect />
      <Achievements />
      <Start />
      <Advanced />
    </g>
  );
}
