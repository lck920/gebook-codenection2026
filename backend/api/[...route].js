/**
 * Vercel Serverless Function entry — deliberately a one-line re-export.
 *
 * This file must exist in the repository as cloned: Vercel registers
 * functions from the initial file listing, before the build command runs.
 * The real handler is bundled by `pnpm vercel-build` into api-dist/route.js
 * (see scripts/build-vercel-function.mjs for why it is pre-bundled), and
 * Vercel traces this import after that build, so the generated file is
 * included. Source lives in api-src/route.ts.
 *
 * The explicit `.js` extension matters: Node's ESM resolver on Vercel does
 * not resolve extensionless relative imports.
 */
export { default } from "../api-dist/route.js";
