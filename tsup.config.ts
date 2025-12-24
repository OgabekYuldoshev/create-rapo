import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  format: "cjs",
  minify: true,
  outDir: "dist",
  tsconfig: "tsconfig.json",
});
