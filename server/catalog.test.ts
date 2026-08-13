import { describe, expect, it } from "vitest";
import { courseFilterSchema } from "./routers";

describe("courseFilterSchema", () => {
  it("accepts the supported catalog filters", () => {
    const parsed = courseFilterSchema.parse({
      search: "GLP-1",
      category: "glp1-basics",
      duration: "30to45",
      doctor: "risa-okada",
      published: "quarter",
      sort: "duration",
    });

    expect(parsed).toMatchObject({
      search: "GLP-1",
      category: "glp1-basics",
      duration: "30to45",
      doctor: "risa-okada",
      published: "quarter",
      sort: "duration",
    });
  });

  it("rejects unsupported filter values", () => {
    expect(() => courseFilterSchema.parse({ duration: "short", sort: "popular" })).toThrow();
  });
});
