import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,
  clean: true,
  format: ["cjs", "esm"],
  minify: true,
  dts: true,
  outDir: "dist",
  tsconfig: "tsconfig.json",
});
