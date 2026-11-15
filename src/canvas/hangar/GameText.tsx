/**
 * A text of the hangar in one of the game's fonts, drawn glyph by glyph from
 * the font's bitmap at a whole scale. Until the font is read, or when the
 * game lacks the font or one of the text's characters, the text is drawn in
 * the editor's font at about the same size.
 */
import { useEditor } from "../../app/store";
import {
  capitalsMiddle,
  fitGameText,
  glyphPictureUrl,
  useGameFont,
  type GameFontName,
} from "./gameFont";

/** Font sizes of the editor's font that come close to the game's fonts at scale 1. */
const FALLBACK_SIZE: Record<GameFontName, number> = {
  HL1: 8,
  HL2: 11,
  JustinFont8: 10,
  JustinFont10: 12,
  JustinFont12Bold: 14,
};

interface Props {
  text: string;
  font: GameFontName;
  scale: number;
  colour: string;
  /** The left edge of the text, or its middle with `centred`. */
  x: number;
  /** The baseline, or the middle of the capitals with `middle`. */
  y: number;
  centred?: boolean;
  middle?: boolean;
  /** A smaller scale is used when the text is wider than this. */
  maxWidth?: number;
  /** Extra space after each glyph, in the font's pixels. */
  letterSpacing?: number;
  testId?: string;
}

export function GameText({
  text,
  font: fontName,
  scale,
  colour,
  x,
  y,
  centred = false,
  middle = false,
  maxWidth,
  letterSpacing = 0,
  testId,
}: Props) {
  const view = useEditor((s) => s.game.data?.view);
  const font = useGameFont(view, fontName);
  const layout = font && text ? fitGameText(font, text, scale, maxWidth, letterSpacing) : undefined;
  if (!font || !layout) {
    return (
      <text
        className="hg-text"
        data-testid={testId}
        x={x}
        y={y}
        fill={colour}
        fontSize={FALLBACK_SIZE[fontName] * scale}
        textAnchor={centred ? "middle" : "start"}
        dominantBaseline={middle ? "central" : "alphabetic"}
      >
        {text}
      </text>
    );
  }
  const s = layout.scale;
  const left = centred
    ? Math.round(x - (layout.inkLeft + layout.inkRight) / 2)
    : x - layout.inkLeft;
  const baseline = middle ? Math.round(y + capitalsMiddle(font, s)) : y;
  const url = glyphPictureUrl(font, colour);
  return (
    <g className="hg-game-text" data-testid={testId} data-text={text}>
      {layout.glyphs.map(({ glyph, x: gx, y: gy }, i) => (
        <svg
          key={i}
          x={left + gx}
          y={baseline + gy}
          width={glyph.width * s}
          height={glyph.height * s}
          viewBox={`${glyph.x} ${glyph.y} ${glyph.width} ${glyph.height}`}
          overflow="hidden"
        >
          <image href={url} width={font.bitmap.width} height={font.bitmap.height} />
        </svg>
      ))}
    </g>
  );
}
