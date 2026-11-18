/**
 * Deletes the selection (asking first when rooms with systems would go);
 * with rooms selected, Duplicate comes first.
 */
import { deleteSelected } from "../../../app/layoutActions";
import { useEditor } from "../../../app/store";
import { usePlatform } from "../../../platform/PlatformContext";
import { useTexts } from "../../../text";
import { DuplicateButton } from "../DuplicateButton";

export function DeleteButton() {
  const texts = useTexts();
  const platform = usePlatform();
  const rooms = useEditor((s) => s.selection.rooms.length > 0);
  return (
    <div className="ed-buttons">
      {rooms && <DuplicateButton />}
      <button
        type="button"
        className="btn btn--danger"
        onClick={() => void deleteSelected({ platform, texts })}
      >
        {texts.inspector.delete}
      </button>
    </div>
  );
}
