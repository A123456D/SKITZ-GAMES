import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5180,
    host: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    target: "es2022",
  },
  test: {
    environment: "node",
  },
});
