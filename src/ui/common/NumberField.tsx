/**
 * A whole-number field that applies its value on Enter or when it loses
 * focus; Esc puts back the current value. A value the owner refuses goes
 * back to the current one as well.
 */
import { useState } from "react";

interface Props {
  label: string;
  value: number;
  /** Applies a new value. */
  onCommit: (value: number) => void;
}

export function NumberField({ label, value, onCommit }: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft.trim());
    setDraft(null);
    if (draft.trim() !== "" && Number.isInteger(parsed) && parsed !== value) onCommit(parsed);
  };

  return (
    <label className="field">
      {label}
      <input
        className="input mono"
        type="number"
        step={1}
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
