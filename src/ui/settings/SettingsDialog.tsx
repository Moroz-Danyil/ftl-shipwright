/** Settings: the interface scale, the theme and the language. */
import type { KeyboardEvent } from "react";
import { useEditor } from "../../app/store";
import { UI_SCALES, type Theme } from "../../app/settings";
import { LANGUAGES, useTexts } from "../../text";
import { Dialog } from "../common/Dialog";

const THEMES: Theme[] = ["dark", "light"];

/** Arrow keys move the choice within a group of radio buttons, as in any radio group. */
function moveChoice<T>(
  e: KeyboardEvent,
  options: readonly T[],
  current: T,
  choose: (value: T) => void
) {
  const step =
    e.key === "ArrowRight" || e.key === "ArrowDown"
      ? 1
      : e.key === "ArrowLeft" || e.key === "ArrowUp"
        ? -1
        : 0;
  if (step === 0) return;
  e.preventDefault();
  const index = options.indexOf(current);
  const next = options[(index + step + options.length) % options.length];
  choose(next);
  const group = e.currentTarget as HTMLElement;
  requestAnimationFrame(() => group.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
}

export function SettingsDialog() {
  const texts = useTexts();
  const uiScale = useEditor((s) => s.uiScale);
  const theme = useEditor((s) => s.theme);
  const language = useEditor((s) => s.language);
  const { setUiScale, setTheme, setLanguage, openDialog } = useEditor.getState();
  const close = () => openDialog(null);

  return (
    <Dialog
      title={texts.settings.title}
      onClose={close}
      actions={
        <button type="button" className="btn" onClick={close}>
          {texts.common.close}
        </button>
      }
    >
      <fieldset className="set-group">
        <legend className="set-label">{texts.settings.scale}</legend>
        <p className="set-hint">{texts.settings.scaleHint}</p>
        <div
          className="set-options"
          role="radiogroup"
          aria-label={texts.settings.scale}
          onKeyDown={(e) =>
            moveChoice(e, UI_SCALES, uiScale as (typeof UI_SCALES)[number], setUiScale)
          }
        >
          {UI_SCALES.map((percent) => (
            <button
              key={percent}
              type="button"
              role="radio"
              aria-checked={percent === uiScale}
              tabIndex={percent === uiScale ? 0 : -1}
              className="set-option"
              onClick={() => setUiScale(percent)}
            >
              {texts.settings.scaleValue(percent)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="set-group">
        <legend className="set-label">{texts.settings.theme}</legend>
        <div
          className="set-options"
          role="radiogroup"
          aria-label={texts.settings.theme}
          onKeyDown={(e) => moveChoice(e, THEMES, theme, setTheme)}
        >
          {THEMES.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === theme}
              tabIndex={id === theme ? 0 : -1}
              className="set-option set-option--wide"
              onClick={() => setTheme(id)}
            >
              {id === "dark" ? texts.settings.dark : texts.settings.light}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="set-group set-field">
        <span className="set-label">{texts.settings.language}</span>
        <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {Object.entries(LANGUAGES).map(([code, dictionary]) => (
            <option key={code} value={code}>
              {dictionary.languageName}
            </option>
          ))}
        </select>
      </label>
    </Dialog>
  );
}
