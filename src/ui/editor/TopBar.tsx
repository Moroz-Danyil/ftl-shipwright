/**
 * The editor's top bar: the ship's name, the workspace tabs, undo and redo,
 * checks, settings and Save mod.
 */
import { shipDisplayName } from "../../app/ships";
import { hasUnsavedChanges, redoAvailable, undoAvailable, useEditor } from "../../app/store";
import { WORKSPACES, workspaceKey } from "../../app/workspaces";
import { usePlatform } from "../../platform/PlatformContext";
import { useTexts } from "../../text";
import { LogoMark, RedoIcon, SettingsIcon, UndoIcon } from "../common/icons";
import { ChecksButton } from "./ChecksButton";

function ShipTitle() {
  const texts = useTexts();
  const platform = usePlatform();
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const data = useEditor((s) => s.game.data);
  const unsaved = useEditor(hasUnsavedChanges);
  if (!ship) return null;

  const close = async () => {
    if (unsaved && !(await platform.confirm(texts.topBar.confirmClose))) return;
    useEditor.getState().closeDocument();
  };

  return (
    <div className="ed-top-side">
      <button
        type="button"
        className="ed-logo"
        aria-label={texts.topBar.closeShip}
        title={texts.topBar.closeShip}
        onClick={() => void close()}
      >
        <LogoMark />
      </button>
      <div className="ed-ship">
        <span className="ed-ship-name">{shipDisplayName(ship, data)}</span>
        <span className="ed-ship-status">
          {ship.blueprint.name} ·{" "}
          {unsaved ? (
            <span className="ed-unsaved">{texts.topBar.unsaved}</span>
          ) : (
            texts.topBar.saved
          )}
        </span>
      </div>
    </div>
  );
}

function WorkspaceTabs() {
  const texts = useTexts();
  const workspace = useEditor((s) => s.workspace);
  const setWorkspace = useEditor((s) => s.setWorkspace);
  return (
    <nav className="ed-tabs" aria-label={texts.topBar.workspaces} role="tablist">
      {WORKSPACES.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={id === workspace}
          className="ed-tab"
          onClick={() => setWorkspace(id)}
        >
          <span className="ed-key">{workspaceKey(id)}</span>
          {texts.workspaces[id].label}
        </button>
      ))}
    </nav>
  );
}

export function TopBar() {
  const texts = useTexts();
  const canUndo = useEditor(undoAvailable);
  const canRedo = useEditor(redoAvailable);
  const { undo, redo, openDialog } = useEditor.getState();
  return (
    <header className="ed-top">
      <ShipTitle />
      <WorkspaceTabs />
      <div className="ed-top-side ed-top-side--end">
        <button
          type="button"
          className="btn btn--icon"
          aria-label={texts.topBar.undo}
          title={texts.topBar.undo}
          disabled={!canUndo}
          onClick={undo}
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="btn btn--icon"
          aria-label={texts.topBar.redo}
          title={texts.topBar.redo}
          disabled={!canRedo}
          onClick={redo}
        >
          <RedoIcon />
        </button>
        <ChecksButton />
        <button
          type="button"
          className="btn btn--icon"
          aria-label={texts.topBar.settings}
          title={texts.topBar.settings}
        >
          <SettingsIcon />
        </button>
        <button
          type="button"
          className="btn btn--primary btn--tall"
          onClick={() => openDialog("save")}
        >
          {texts.topBar.saveMod}
        </button>
      </div>
    </header>
  );
}
