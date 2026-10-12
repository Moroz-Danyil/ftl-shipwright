import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The desktop shell loads the dev server from a fixed address, so the port must not change.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
