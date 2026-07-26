import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5175,
    watch: {
      ignored: ["**/godot/.godot/**", "**/godot/android/**", "**/dist/**"],
    },
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
