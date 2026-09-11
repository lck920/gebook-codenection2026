import { handle } from "hono/vercel";
import { createContainer } from "../src/infrastructure/composition/container";
import { loadConfig } from "../src/infrastructure/config";
import { createNodeStorage } from "../src/infrastructure/storage/create-node-storage";
import { createApp } from "../src/interfaces/http/app";
import { sentry } from "@sentry/hono/node";
import * as Sentry from "@sentry/node";
import { initializeNodeObservability } from "../src/infrastructure/observability/node";
import {
  registerAiTelemetry,
  setRuntimeName,
} from "../src/infrastructure/observability";

/**
 * Vercel Serverless Function entry point (Node.js runtime). Reuses the same
 * Hono app as node-server.ts — the only difference is `handle()` from
 * hono/vercel instead of @hono/node-server's `serve()`. The `[[...route]]`
 * filename is Vercel's catch-all convention: every request under `/api/*`
 * (and `/api` itself) is routed here, but the Hono app still sees the
 * original path and does its own internal routing.
 *
 * Runs once per warm container, not per request, so the config/container
 * construction below is a one-time cost per instance, same as a long-lived
 * Node process.
 */
const config = loadConfig(process.env);
setRuntimeName("node");
initializeNodeObservability(config.observability);
registerAiTelemetry();
const container = createContainer(config, createNodeStorage(config.storage));
const app = createApp(container, {
  runtime: "node",
  instrument: (hono) => hono.use("*", sentry(hono)),
  setRequestContext: ({ requestId }) => {
    Sentry.setTag("request.id", requestId);
  },
});

export default handle(app);
