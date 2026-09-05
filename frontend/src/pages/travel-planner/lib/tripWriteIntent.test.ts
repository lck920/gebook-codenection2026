import { describe, expect, it } from "vitest";
import { looksLikeTripWriteRequest } from "./tripWriteIntent";

describe("looksLikeTripWriteRequest", () => {
  it("routes a request aimed at the assistant", () => {
    expect(looksLikeTripWriteRequest("yeah, and can u add to the schedule")).toBe(
      true,
    );
    expect(looksLikeTripWriteRequest("please move lunch to 13:00")).toBe(true);
    expect(looksLikeTripWriteRequest("could you remove the gondola stop")).toBe(
      true,
    );
  });

  it("routes a bare imperative, filler and all", () => {
    expect(looksLikeTripWriteRequest("add Moraine Lake to day 2")).toBe(true);
    expect(looksLikeTripWriteRequest("ok then, update day 3 to Lake Louise")).toBe(
      true,
    );
  });

  it("routes Chinese edit requests", () => {
    expect(looksLikeTripWriteRequest("帮我把午餐改到 13:00")).toBe(true);
    expect(looksLikeTripWriteRequest("添加 Moraine Lake 到第二天")).toBe(true);
  });

  it("leaves questions and chatter on the ambient path", () => {
    expect(looksLikeTripWriteRequest("what should we add to day 2?")).toBe(false);
    expect(looksLikeTripWriteRequest("how is the weather in Banff")).toBe(false);
    expect(looksLikeTripWriteRequest("I added lunch already")).toBe(false);
    expect(looksLikeTripWriteRequest("")).toBe(false);
  });

  it("does not hijack a line addressed to a teammate", () => {
    expect(
      looksLikeTripWriteRequest("@Steven can you add Moraine Lake to day 2", [
        "Steven",
      ]),
    ).toBe(false);
    expect(
      looksLikeTripWriteRequest("@agent can you add Moraine Lake to day 2", [
        "Steven",
      ]),
    ).toBe(true);
  });
});
