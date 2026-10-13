/**
 * A small picture that shows itself large beside the inspector on hover,
 * with its name and size in pixels.
 */
import type { ReactNode } from "react";
import type { LoadedPicture } from "../../canvas/pictures";
import { useTexts } from "../../text";
import { HoverPanel } from "./HoverPanel";
import { useHoverPanel } from "./useHoverPanel";

export function PictureZoom({
  picture,
  title,
  name,
  className,
  children,
}: {
  picture: LoadedPicture | undefined;
  title: string;
  /** The file name, when it says more than the title. */
  name?: string;
  className: string;
  children: ReactNode;
}) {
  const texts = useTexts();
  const panel = useHoverPanel<LoadedPicture>();
  return (
    <span
      className={className}
      onPointerEnter={(e) => picture && panel.show(picture, e.currentTarget)}
      onPointerLeave={panel.hide}
    >
      {children}
      {panel.shown && (
        <HoverPanel
          anchor={panel.shown.anchor}
          picture={<img className="zoom-img" src={panel.shown.value.url} alt="" />}
        >
          <section className="lo-details" aria-label={title}>
            <span className="lo-details-title">{title}</span>
            {name && <span className="eyebrow mono">{name}</span>}
            <span className="muted mono">
              {texts.art.pictureSize(panel.shown.value.width, panel.shown.value.height)}
            </span>
          </section>
        </HoverPanel>
      )}
    </span>
  );
}
