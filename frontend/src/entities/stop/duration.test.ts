import { describe, expect, it } from "vitest";
import { formatDuration, parseDurationMinutes } from "./duration";

describe("parseDurationMinutes", () => {
  it("reads every shape the stored data uses", () => {
    expect(parseDurationMinutes("45m")).toBe(45);
    expect(parseDurationMinutes("1h")).toBe(60);
    expect(parseDurationMinutes("1.5h")).toBe(90);
    expect(parseDurationMinutes("2.5h")).toBe(150);
    expect(parseDurationMinutes("1h 30m")).toBe(90);
    expect(parseDurationMinutes("90 min")).toBe(90);
    expect(parseDurationMinutes("90")).toBe(90);
  });

  it("returns null for anything it cannot understand", () => {
    expect(parseDurationMinutes("")).toBeNull();
    expect(parseDurationMinutes("all afternoon")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("keeps the existing vocabulary", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1.5h");
    expect(formatDuration(150)).toBe("2.5h");
    expect(formatDuration(105)).toBe("1h 45m");
    expect(formatDuration(0)).toBe("0m");
  });

  it("round-trips the seeded values unchanged", () => {
    for (const value of ["45m", "1h", "1.5h", "2h", "2.5h", "3h"]) {
      const minutes = parseDurationMinutes(value);
      expect(minutes).not.toBeNull();
      expect(formatDuration(minutes as number)).toBe(value);
    }
  });
});
