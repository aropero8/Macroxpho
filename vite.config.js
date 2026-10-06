import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" hace que los assets funcionen dentro del WebView de Capacitor
export default defineConfig({
  base: "./",
  plugins: [react()],
  // 5173 lo usa otro proyecto; strictPort evita saltar a otro puerto en silencio
  server: { port: 5180, strictPort: true },
});
