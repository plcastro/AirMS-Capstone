import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {
    alias: [
      {
        find: /^antd$/,
        replacement: path.resolve(__dirname, "src/utils/antdProxy.jsx"),
      },
    ],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Keep export-heavy libraries lazy and isolated by export type.
            if (id.includes("exceljs")) return "export-excel";
            if (id.includes("html2canvas")) return "export-canvas";
            if (id.includes("file-saver")) return "export-file";
            // Group core React/Router libraries
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            ) {
              return "vendor";
            }
          }
        },
      },
    },
  },
});
