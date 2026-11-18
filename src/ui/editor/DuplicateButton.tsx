/** Duplicates the selection, as Ctrl+D does; from a button the copy goes next to the original. */
import { duplicateSelection } from "../../app/clipboardActions";
import { useTexts } from "../../text";

export function DuplicateButton({ small = false }: { small?: boolean }) {
  const texts = useTexts();
  return (
    <button
      type="button"
      className={small ? "btn btn--small" : "btn"}
      title={texts.common.withKey(texts.clipboard.duplicate, texts.clipboard.duplicateKey)}
      onClick={() => duplicateSelection(texts)}
    >
      {texts.clipboard.duplicate}
    </button>
  );
}
