import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5177,
    host: "127.0.0.1",
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
