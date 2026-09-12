/**
 * Vercel Serverless Function entry — deliberately tiny.
 *
 * Two things about its shape are load-bearing, both learned from a live
 * deployment rather than the docs:
 *
 * 1. It is `api/index.js`, reached through a rewrite of `/api/(.*)` in
 *    vercel.json. A bracketed filename such as `api/[...route].js` matched
 *    only ONE path segment on Vercel: /api/health reached the function,
 *    /api/auth/sign-in/email got Vercel's own 404.
 *
 * 2. It exports `{ fetch }`, the web-standard shape Vercel documents for
 *    Hono. A bare `export default (req) => …` is treated as the legacy Node
 *    `(req, res)` handler, so `app.fetch` was handed an IncomingMessage and
 *    `res` was never ended — every request hung with no response at all.
 *
 * The real handler is bundled by `pnpm vercel-build` into api-dist/route.js
 * (see scripts/build-vercel-function.mjs). This file must exist in the repo
 * as cloned, because Vercel registers functions before the build runs; it
 * then traces this import after the build, when the bundle is present.
 */
import handler from "../api-dist/route.js";

export default {
  fetch: (request) => handler(request),
};
