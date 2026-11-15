/**
 * Hover help for a field or control: hovering or focusing it shows a panel
 * beside the inspector with what it means in the game, and a picture of how
 * the game shows it where there is one.
 */
import type { ReactNode } from "react";
import { useTexts, type Texts } from "../../text";
import { HelpVisual } from "./HelpVisual";
import { HoverPanel } from "./HoverPanel";
import { useHoverPanel } from "./useHoverPanel";

export type HelpTopic = keyof Texts["help"];

/**
 * `field` names the element for the Overview to point at (`data-field`);
 * it is the topic unless given.
 */
export function Help({
  topic,
  field,
  children,
}: {
  topic: HelpTopic;
  field?: string;
  children: ReactNode;
}) {
  const texts = useTexts();
  const panel = useHoverPanel<HelpTopic>();
  const { title, body } = texts.help[topic];
  return (
    <div
      className="help-target"
      data-field={field ?? topic}
      onPointerEnter={(e) => panel.show(topic, e.currentTarget)}
      onPointerLeave={panel.hide}
      onFocus={(e) => panel.show(topic, e.currentTarget)}
      onBlur={panel.hide}
    >
      {children}
      {panel.shown && (
        <HoverPanel anchor={panel.shown.anchor}>
          <section className="lo-details" aria-label={title}>
            <span className="lo-details-title">{title}</span>
            <HelpVisual topic={topic} />
            <p className="lo-details-text muted">{body}</p>
          </section>
        </HoverPanel>
      )}
    </div>
  );
}
