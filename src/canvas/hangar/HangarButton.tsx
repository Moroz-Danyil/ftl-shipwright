/**
 * A button the hangar draws itself: a light shape with cut corners (yellow
 * when chosen) and its label centred on it in the game's `HL2` font, dark.
 */
import { GameText } from "./GameText";
import { HANGAR_COLOURS, cutCornerPoints, rectMiddle, type HangarButtonRect } from "./hangarLayout";

interface Props {
  rect: HangarButtonRect;
  label: string;
  /** How many times the font's size the label is drawn. */
  scale?: number;
  chosen?: boolean;
  font?: "HL1" | "HL2";
}

export function HangarButton({ rect, label, scale = 2, chosen = false, font = "HL2" }: Props) {
  const middle = rectMiddle(rect);
  return (
    <g className="hg-button" data-chosen={chosen || undefined}>
      <polygon
        points={cutCornerPoints(rect)}
        fill={chosen ? HANGAR_COLOURS.chosen : HANGAR_COLOURS.light}
        shapeRendering="crispEdges"
      />
      <GameText
        text={label}
        font={font}
        scale={scale}
        colour={HANGAR_COLOURS.dark}
        x={middle.x}
        y={middle.y}
        centred
        middle
        maxWidth={rect.w - 4}
      />
    </g>
  );
}
