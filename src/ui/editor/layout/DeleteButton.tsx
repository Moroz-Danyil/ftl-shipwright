/**
 * Deletes the selected rooms, doors, stations, mounts and gibs (asking first
 * when rooms with systems would go); with rooms, mounts or gibs selected,
 * Duplicate comes first.
 */
import { deleteSelected } from "../../../app/layoutActions";
import { useEditor } from "../../../app/store";
import { usePlatform } from "../../../platform/PlatformContext";
import { useTexts } from "../../../text";
import { DuplicateButton } from "../DuplicateButton";

export function DeleteButton({ small = false }: { small?: boolean }) {
  const texts = useTexts();
  const platform = usePlatform();
  const copies = useEditor(
    ({ selection: s }) => s.rooms.length + s.mounts.length + s.gibs.length > 0
  );
  return (
    <div className="ed-buttons">
      {copies && <DuplicateButton small={small} />}
      <button
        type="button"
        className={small ? "btn btn--small btn--danger" : "btn btn--danger"}
        onClick={() => void deleteSelected({ platform, texts })}
      >
        {texts.inspector.delete}
      </button>
    </div>
  );
}
