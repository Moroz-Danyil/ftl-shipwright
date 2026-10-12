/** Deletes the selection (asking first when rooms with systems would go). */
import { deleteSelected } from "../../../app/layoutActions";
import { usePlatform } from "../../../platform/PlatformContext";
import { useTexts } from "../../../text";

export function DeleteButton() {
  const texts = useTexts();
  const platform = usePlatform();
  return (
    <div>
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
