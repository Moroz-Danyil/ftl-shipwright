/**
 * A text field (one line, or several with `multiline`) that applies its value
 * when it loses focus or on Enter (one line only); Esc puts back the current
 * value. The owner may refuse a value by returning (or resolving to) false.
 */
import { useState } from "react";

interface Props {
  label: string;
  value: string;
  multiline?: boolean;
  className?: string;
  onCommit: (value: string) => boolean | void | Promise<boolean | void>;
}

export function TextField({
  label,
  value,
  multiline = false,
  className = "input",
  onCommit,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const next = draft;
    setDraft(null);
    if (next !== value) void onCommit(next);
  };

  const common = {
    className,
    value: draft ?? value,
    onBlur: commit,
  };

  return (
    <label className="field">
      {label}
      {multiline ? (
        <textarea
          {...common}
          rows={4}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDraft(null);
          }}
        />
      ) : (
        <input
          {...common}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setDraft(null);
          }}
        />
      )}
    </label>
  );
}
