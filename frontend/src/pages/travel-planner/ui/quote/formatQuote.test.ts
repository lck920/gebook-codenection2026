import { describe, expect, it } from "vitest";
import {
  composeWithQuote,
  formatQuoteBlock,
  parseLeadingQuote,
} from "./formatQuote";

describe("formatQuoteBlock", () => {
  it("prefixes each line with > and the author on the first line", () => {
    expect(formatQuoteBlock("Marco", "Go early\nBring cash")).toBe(
      "> Marco: Go early\n> Bring cash",
    );
  });
});

describe("composeWithQuote", () => {
  it("returns the draft when there is no quote", () => {
    expect(composeWithQuote(null, "  hello  ")).toBe("hello");
  });

  it("puts the quote first and the @mention with the reply body", () => {
    expect(
      composeWithQuote(
        { author: "Marco", text: "Go early", mentionToken: "Marco" },
        "agreed",
      ),
    ).toBe("> Marco: Go early\n\n@Marco agreed");
  });
});

describe("parseLeadingQuote", () => {
  it("splits a leading blockquote from the body", () => {
    expect(
      parseLeadingQuote("> Marco: Go early\n\n@Marco agreed"),
    ).toEqual({
      quote: { author: "Marco", text: "Go early" },
      body: "@Marco agreed",
    });
  });

  it("returns the full text when there is no quote", () => {
    expect(parseLeadingQuote("plain")).toEqual({
      quote: null,
      body: "plain",
    });
  });
});
