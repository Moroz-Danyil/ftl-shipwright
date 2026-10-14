/**
 * The hangar's other boxes, drawn only for the look: the ship and layout
 * box with its arrows, the achievements box, the Start box with the
 * difficulties and the Advanced Edition box. Their texts are the game's own;
 * nothing here does anything.
 */
import { HANGAR_BOXES, HANGAR_PICTURES } from "./hangarLayout";
import { ScreenPicture } from "./ScreenPicture";
import { useGameText } from "./useGameText";

function Text({
  textKey,
  x,
  y,
  kind = "button",
}: {
  textKey: string;
  x: number;
  y: number;
  kind?: "button" | "title" | "small" | "start";
}) {
  const text = useGameText(textKey);
  return (
    <text className={`hg-text hg-text--${kind}`} x={x} y={y}>
      {text}
    </text>
  );
}

function ShipSelect() {
  const { x, y } = HANGAR_BOXES.shipSelect;
  const middle = x + 96;
  return (
    <g>
      <ScreenPicture path={HANGAR_PICTURES.shipSelect} x={x} y={y} />
      <Text textKey="hangar_frame_ship" x={x + 19} y={y + 20} kind="title" />
      <ScreenPicture path={HANGAR_PICTURES.arrow} x={x + 17} y={y + 38} />
      <ScreenPicture path={HANGAR_PICTURES.arrow} x={x + 143} y={y + 38} mirror />
      <Text textKey="ship_list_button" x={middle} y={y + 53} />
      <Text textKey="ship_random_button" x={middle} y={y + 87} />
      <Text textKey="hangar_frame_layout" x={x + 19} y={y + 123} kind="title" />
      <Text textKey="typebutton_a" x={middle - 50} y={y + 156} />
      <Text textKey="typebutton_b" x={middle} y={y + 156} />
      <Text textKey="typebutton_c" x={middle + 50} y={y + 156} />
      <Text textKey="ship_hiderooms_button" x={middle} y={y + 206} />
    </g>
  );
}

function Achievements() {
  const { x, y } = HANGAR_BOXES.achievements;
  return (
    <g>
      <ScreenPicture path={HANGAR_PICTURES.achievements} x={x} y={y} />
      <Text textKey="hangar_achievements_title" x={x + 125} y={y + 26} kind="small" />
    </g>
  );
}

function Start() {
  const { x, y } = HANGAR_BOXES.start;
  return (
    <g>
      <ScreenPicture path={HANGAR_PICTURES.start} x={x} y={y} />
      <Text textKey="easy_button" x={x + 60} y={y + 26} />
      <Text textKey="normal_button" x={x + 60} y={y + 52} />
      <Text textKey="hard_button" x={x + 60} y={y + 78} />
      <Text textKey="start_button" x={x + 195} y={y + 38} kind="start" />
    </g>
  );
}

function Advanced() {
  const { x, y } = HANGAR_BOXES.advanced;
  return (
    <g>
      <ScreenPicture path={HANGAR_PICTURES.advanced} x={x} y={y} />
      <Text textKey="hangar_advanced_title" x={x + 133} y={y + 21} kind="small" />
      <Text textKey="advanced_off_button" x={x + 68} y={y + 53} />
      <Text textKey="advanced_on_button" x={x + 200} y={y + 53} />
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
