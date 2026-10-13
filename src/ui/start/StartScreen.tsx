/**
 * Shown when no ship is open: new ship, open a ship, recent ships, the game
 * data and the language.
 */
import { LANGUAGES, useTexts } from "../../text";
import { useEditor } from "../../app/store";
import { FolderIcon, LogoMark } from "../common/icons";
import { GameDataCard } from "./GameDataCard";
import { NewShipDialog } from "./NewShipDialog";
import { OpenShipDialog } from "./OpenShipDialog";
import { RecentList } from "./RecentList";

function Actions() {
  const texts = useTexts();
  const ready = useEditor((s) => s.game.status === "ready");
  const openDialog = useEditor((s) => s.openDialog);
  return (
    <div className="st-actions">
      <button
        type="button"
        className="st-action st-action--main"
        disabled={!ready}
        onClick={() => openDialog("newShip")}
      >
        <span className="st-action-icon" aria-hidden="true">
          +
        </span>
        <span className="st-action-title">{texts.start.newShip}</span>
        <span className="st-action-body">{texts.start.newShipBody}</span>
        {!ready && <span className="st-needs">{texts.start.needGameData}</span>}
      </button>
      <button
        type="button"
        className="st-action"
        disabled={!ready}
        onClick={() => openDialog("openShip")}
      >
        <span className="st-action-icon" aria-hidden="true">
          <FolderIcon />
        </span>
        <span className="st-action-title">{texts.start.openShip}</span>
        <span className="st-action-body">{texts.start.openShipBody}</span>
        {!ready && <span className="st-needs">{texts.start.needGameData}</span>}
      </button>
    </div>
  );
}

function LanguageCard() {
  const texts = useTexts();
  const language = useEditor((s) => s.language);
  return (
    <section className="st-card">
      <label className="st-language">
        {texts.start.language}
        <select value={language} onChange={(e) => useEditor.getState().setLanguage(e.target.value)}>
          {Object.entries(LANGUAGES).map(([code, dictionary]) => (
            <option key={code} value={code}>
              {dictionary.languageName}
            </option>
          ))}
        </select>
      </label>
      <div className="st-links">
        <button type="button" className="link">
          {texts.start.tour}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => useEditor.getState().openDialog("settings")}
        >
          {texts.start.settings}
        </button>
      </div>
    </section>
  );
}

export function StartScreen() {
  const texts = useTexts();
  const dialog = useEditor((s) => s.dialog);
  return (
    <div className="st-screen">
      <section className="st-main">
        <header className="st-brand">
          <LogoMark size={52} />
          <div className="st-brand-text">
            <h1 className="st-title">{texts.app.name}</h1>
            <span className="st-tagline">{texts.app.tagline}</span>
          </div>
        </header>
        <Actions />
        <RecentList />
      </section>
      <aside className="st-side">
        <GameDataCard />
        <LanguageCard />
      </aside>
      {dialog === "newShip" && <NewShipDialog />}
      {dialog === "openShip" && <OpenShipDialog />}
    </div>
  );
}
