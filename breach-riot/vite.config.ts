import { defineConfig } from "vite";
import { scoresApi } from "./scores-dev-api.mjs";

export default defineConfig({
  base: "./",
  server: {
    port: 5177,
    host: "127.0.0.1",
  },
  preview: {
    port: 5177,
    host: "127.0.0.1",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
  },
  plugins: [scoresApi()],
  test: {
    environment: "node",
  },
});
