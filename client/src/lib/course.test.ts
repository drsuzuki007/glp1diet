import { describe, expect, it } from "vitest";
import { formatYen, splitText } from "./course";

describe("course presentation helpers", () => {
  it("formats Japanese yen without decimal places", () => {
    expect(formatYen(2980)).toBe("¥2,980");
  });

  it("splits serialized course learning points while removing empty entries", () => {
    expect(splitText("確認する|相談する||振り返る")).toEqual(["確認する", "相談する", "振り返る"]);
  });
});
