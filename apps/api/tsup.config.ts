import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/worker.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Workspace packages ship TS source, so they must be bundled (not left external).
  noExternal: ["@layerflow/contracts", "@layerflow/model-registry"],
});
