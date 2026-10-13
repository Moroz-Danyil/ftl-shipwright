/** A whole number between limits with − and + buttons, shown as "value / max" or just the value. */
import { useTexts } from "../../text";
import { Pictogram, type PictogramId } from "./Pictogram";

interface Props {
  label: string;
  /** A pictogram before the label. */
  icon?: PictogramId;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Show "value / max" (default) or just the value. */
  showMax?: boolean;
}

export function Stepper({ label, icon, value, min, max, onChange, showMax = true }: Props) {
  const texts = useTexts();
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span className="stepper-label">
        {icon && <Pictogram id={icon} size={20} />}
        {label}
      </span>
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
        {showMax ? texts.systems.levelOf(value, max) : value}
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
