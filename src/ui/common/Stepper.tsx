/** A whole number between limits with − and + buttons, shown as "value / max". */
import { useTexts } from "../../text";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function Stepper({ label, value, min, max, onChange }: Props) {
  const texts = useTexts();
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span className="stepper-label">{label}</span>
      <button
        type="button"
        className="btn btn--icon btn--small"
        aria-label={texts.systems.lower(label)}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        {texts.systems.minus}
      </button>
      <span className="stepper-value mono" aria-live="polite">
        {texts.systems.levelOf(value, max)}
      </span>
      <button
        type="button"
        className="btn btn--icon btn--small"
        aria-label={texts.systems.higher(label)}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        {texts.systems.plus}
      </button>
    </div>
  );
}
