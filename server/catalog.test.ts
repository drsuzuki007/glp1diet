import { describe, expect, it } from "vitest";
import { courseFilterSchema } from "./routers";

describe("courseFilterSchema", () => {
  it("accepts the supported catalog filters", () => {
    const parsed = courseFilterSchema.parse({
      search: "GLP-1",
      category: "glp1-basics",
      price: "1500to3000",
      duration: "30to45",
      doctor: "risa-okada",
      published: "quarter",
      sort: "priceAsc",
    });

    expect(parsed).toMatchObject({
      search: "GLP-1",
      category: "glp1-basics",
      price: "1500to3000",
      duration: "30to45",
      doctor: "risa-okada",
      published: "quarter",
      sort: "priceAsc",
    });
  });

  it("rejects unsupported filter values", () => {
    expect(() => courseFilterSchema.parse({ price: "free", sort: "popular" })).toThrow();
  });
});
