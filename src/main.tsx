import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./ui/styles/theme.css";
import "./ui/styles/dialog.css";
import "./ui/styles/start.css";
import "./ui/styles/editor.css";
import { createTauriPlatform } from "./platform/tauri";
import { App } from "./ui/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App platform={createTauriPlatform()} />
  </StrictMode>
);
