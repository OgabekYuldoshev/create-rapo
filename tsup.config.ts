import { defineConfig } from "tsup";

export default defineConfig({
	bundle: true,
	clean: true,
	format: "esm",
	minify: true,
	outDir: "dist",
	tsconfig: "tsconfig.json",
});
