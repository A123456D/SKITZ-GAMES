import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5178,
    host: "127.0.0.1",
    watch: {
      // Godot locks assets while the editor/game is open; watching them crashes Vite.
      // Large MP3s can also EBUSY while the browser is streaming them.
      ignored: ["**/godot/**", "**/public/audio/**"],
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
