import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ data }, status);
}

export function fail(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode,
) {
  return c.json({ error: { code, message } }, status);
}
