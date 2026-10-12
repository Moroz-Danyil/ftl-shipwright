/**
 * The root of the interface: the start screen or the editor, with the
 * platform, the texts and the keyboard set up.
 */
import { useEffect, useRef } from "react";
import { loadGameIntoStore } from "../app/gameData";
import { useEditor } from "../app/store";
import { useKeyboard } from "../app/useKeyboard";
import { PlatformContext, usePlatform } from "../platform/PlatformContext";
import type { Platform } from "../platform/types";
import { useTexts } from "../text";
import { TextsProvider } from "../text/TextsProvider";
import { LogoMark } from "./common/icons";
import { NoticeBar } from "./common/NoticeBar";
import { EditorWindow } from "./editor/EditorWindow";
import { StartScreen } from "./start/StartScreen";

/** Loads the remembered game data once, when the app starts. */
function useRememberedGameData() {
  const platform = usePlatform();
  const texts = useTexts();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const { game } = useEditor.getState();
    if (game.datPath && game.status === "none")
      void loadGameIntoStore(platform, texts, game.datPath, game.mod);
  }, [platform, texts]);
}

function NotInApp() {
  const texts = useTexts();
  return (
    <div className="st-screen">
      <section className="st-main">
        <header className="st-brand">
          <LogoMark size={52} />
          <div className="st-brand-text">
            <h1 className="st-title">{texts.notInApp.title}</h1>
            <span className="st-tagline">{texts.notInApp.body}</span>
          </div>
        </header>
      </section>
    </div>
  );
}

function Shell() {
  useKeyboard();
  useRememberedGameData();
  const hasShip = useEditor((s) => s.doc !== undefined);
  return (
    <>
      {hasShip ? <EditorWindow /> : <StartScreen />}
      <NoticeBar />
    </>
  );
}

export function App({ platform }: { platform: Platform }) {
  const language = useEditor((s) => s.language);
  return (
    <PlatformContext.Provider value={platform}>
      <TextsProvider language={language}>
        {platform.available ? <Shell /> : <NotInApp />}
      </TextsProvider>
    </PlatformContext.Provider>
  );
}
