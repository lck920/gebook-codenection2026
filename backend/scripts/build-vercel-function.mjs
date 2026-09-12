import { build } from "esbuild";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const backendRoot = fileURLToPath(new URL("..", import.meta.url));

const pkg = JSON.parse(
  await readFile(`${backendRoot}package.json`, "utf8"),
);

/**
 * Real npm packages resolve fine as external imports on Vercel (Node
 * resolves them from node_modules the same way it does for
 * node-server.ts locally). The two @gebook/* workspace packages are
 * NOT that — they're raw TS source linked via the pnpm workspace
 * protocol, with the same extensionless-import shape as this repo's
 * own src/, so they need to be bundled in rather than left external.
 */
const external = Object.keys(pkg.dependencies ?? {}).filter(
  (name) => !name.startsWith("@gebook/"),
);

/**
 * Vercel ships local project files as separate, untranspiled-import
 * modules rather than bundling them, so Node's strict ESM resolver
 * (this project runs "type": "module") fails on the codebase's
 * extensionless relative imports at runtime — a mismatch that only
 * shows up on Vercel, since `tsx` resolves those imports itself
 * locally. Pre-bundling the function into one file with esbuild
 * inlines every local import (only npm packages stay external, which
 * Node already resolves the same way node-server.ts does locally) so
 * there's nothing left for Vercel's own resolver to trip over.
 */
await mkdir(`${backendRoot}api`, { recursive: true });

await build({
  entryPoints: [`${backendRoot}api-src/route.ts`],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external,
  // Single-bracket catch-all: the form Vercel documents for plain api/
  // functions. The optional [[...route]] variant is a Next.js convention,
  // and nothing here needs it — every route lives under /api/<something>.
  outfile: `${backendRoot}api/[...route].js`,
  logLevel: "info",
});
