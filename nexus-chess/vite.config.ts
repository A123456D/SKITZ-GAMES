import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5176,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
  },
  test: {
    environment: "node",
  },
});
