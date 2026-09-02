/** Schema-based JSON pick / flatten helpers (from openbnb-org/mcp-server-airbnb, MIT). */

export function cleanObject(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value == null || key === "__typename") {
      delete obj[key];
    } else if (typeof value === "object") {
      cleanObject(value as Record<string, unknown>);
    }
  }
}

export function diagnoseJsonPath(data: unknown, path: string[]): string {
  let current: unknown = data;
  for (const key of path) {
    if (current == null || typeof current !== "object") {
      return `Path broken at '${key}': parent is ${current === null ? "null" : typeof current}`;
    }
    if (!(key in (current as object))) {
      const available = Object.keys(current as object).slice(0, 10).join(", ");
      return `Key '${key}' not found. Available keys: [${available}]`;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return "Path valid";
}

export function pickBySchema(obj: unknown, schema: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => pickBySchema(item, schema));
  }
  if (schema === true) return obj;
  if (typeof schema !== "object" || schema === null) return obj;

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(schema as Record<string, unknown>)) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const rule = (schema as Record<string, unknown>)[key];
    const value = (obj as Record<string, unknown>)[key];
    if (rule === true) {
      result[key] = value;
    } else if (typeof rule === "object" && rule !== null) {
      result[key] = pickBySchema(value, rule);
    }
  }
  return result;
}

export function flattenArraysInObject(
  input: unknown,
  inArray = false,
): unknown {
  if (Array.isArray(input)) {
    const flatItems = input.map((item) => flattenArraysInObject(item, true));
    return flatItems.join(", ");
  }
  if (typeof input === "object" && input !== null) {
    if (inArray) {
      const values = Object.values(input).map((value) =>
        flattenArraysInObject(value, true),
      );
      return values.join(": ");
    }
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(input)) {
      if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
      result[key] = flattenArraysInObject(
        (input as Record<string, unknown>)[key],
        false,
      );
    }
    return result;
  }
  return input;
}
