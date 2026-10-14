/**
 * The editor's top bar: the ship's name, the workspace tabs, undo and redo,
 * the tutorial, the overview, settings and Save mod.
 */
import { shipDisplayName } from "../../app/ships";
import { hasUnsavedChanges, keyOf, redoAvailable, undoAvailable, useEditor } from "../../app/store";
import { WORKSPACES, workspaceKey } from "../../app/workspaces";
import { useTexts } from "../../text";
import { LogoMark, RedoIcon, SettingsIcon, UndoIcon } from "../common/icons";
import { OverviewButton } from "./Overview";

function ShipTitle() {
  const texts = useTexts();
  const ship = useEditor((s) => s.doc?.history.present.ship);
  const data = useEditor((s) => s.game.data);
  const unsaved = useEditor(hasUnsavedChanges);
  if (!ship) return null;

  const close = async () => {
    const { askConfirm } = useEditor.getState();
    if (unsaved && !(await askConfirm({ ...texts.topBar.confirmClose, danger: true }))) return;
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
          data-tour="workspaces"
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
  const undoKey = useEditor(keyOf("undo"));
  const redoKey = useEditor(keyOf("redo"));
  const { undo, redo, openDialog, startTour } = useEditor.getState();
  return (
    <header className="ed-top">
      <ShipTitle />
      <WorkspaceTabs />
      <div className="ed-top-side ed-top-side--end">
        <button
          type="button"
          className="btn btn--icon"
          aria-label={texts.topBar.undo}
          data-tour="undo"
          title={texts.common.withKey(texts.topBar.undo, undoKey)}
          disabled={!canUndo}
          onClick={undo}
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="btn btn--icon"
          aria-label={texts.topBar.redo}
          data-tour="undo"
          title={texts.common.withKey(texts.topBar.redo, redoKey)}
          disabled={!canRedo}
          onClick={redo}
        >
          <RedoIcon />
        </button>
        <button
          type="button"
          className="btn btn--tall"
          title={texts.topBar.tutorialHint}
          onClick={startTour}
        >
          {texts.topBar.tutorial}
        </button>
        <OverviewButton />
        <button
          type="button"
          className="btn btn--icon"
          aria-label={texts.topBar.settings}
          data-tour="settings"
          title={texts.topBar.settings}
          onClick={() => useEditor.getState().openDialog("settings")}
        >
          <SettingsIcon />
        </button>
        <button
          type="button"
          className="btn btn--primary btn--tall"
          data-tour="settings"
          onClick={() => openDialog("save")}
        >
          {texts.topBar.saveMod}
        </button>
      </div>
    </header>
  );
}
