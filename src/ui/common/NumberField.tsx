/**
 * A number field that applies its value on Enter or when it loses
 * focus; Esc puts back the current value. A value the owner refuses goes
 * back to the current one as well.
 */
import { useState } from "react";

interface Props {
  label: string;
  /** A fuller name for screen readers when the visible label is short. */
  ariaLabel?: string;
  value: number;
  /** Accept fractions (e.g. gib speeds); otherwise whole numbers only. */
  decimals?: boolean;
  /** Applies a new value. */
  onCommit: (value: number) => void;
}

export function NumberField({ label, ariaLabel, value, decimals = false, onCommit }: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft.trim());
    setDraft(null);
    const valid = decimals ? Number.isFinite(parsed) : Number.isInteger(parsed);
    if (draft.trim() !== "" && valid && parsed !== value) onCommit(parsed);
  };

  return (
    <label className="field">
      {label}
      <input
        className="input mono"
        type="number"
        aria-label={ariaLabel}
        step={decimals ? "any" : 1}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setDraft(null);
        }}
      />
    </label>
  );
}
