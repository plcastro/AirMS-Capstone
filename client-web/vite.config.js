import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Put all export-related heavy lifting in one separate file
          "export-libs": ["jspdf", "jspdf-autotable", "exceljs", "html2canvas"],
          // Put react internals in another
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
