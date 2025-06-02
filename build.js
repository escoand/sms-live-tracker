import browserslistToEsbuild from "browserslist-to-esbuild";
import { build } from "esbuild";
import { existsSync, writeFile } from "node:fs";

const configFile = "www/config.json";

// write config
if (process.argv.length > 2 && !existsSync(configFile)) {
  writeFile(
    configFile,
    JSON.stringify({
      apiKey: process.argv[2],
      routesUrl: process.argv[3],
      trackersUrl: process.argv[4],
    }),
    () => {}
  );
}

await build({
  bundle: true,
  entryPoints: ["src/index.ts"],
  format: "iife",
  minify: true,
  outdir: "www",
  sourcemap: true,
  target: browserslistToEsbuild(),
});
