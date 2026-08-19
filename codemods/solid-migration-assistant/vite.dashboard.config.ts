import { resolve } from "node:path";
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: resolve(import.meta.dirname, "dashboard"),
  base: "./",
  plugins: [solid(), viteSingleFile()],
  build: {
    target: "es2022",
    outDir: resolve(import.meta.dirname, "dashboard-dist"),
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
  },
});
