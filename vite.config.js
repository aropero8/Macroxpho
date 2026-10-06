import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" hace que los assets funcionen dentro del WebView de Capacitor
export default defineConfig({
  base: "./",
  plugins: [react()],
});
