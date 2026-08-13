import { describe, expect, it } from "vitest";

describe("application title configuration", () => {
  it("uses glp1.diet as the configured site name", () => {
    expect(process.env.VITE_APP_TITLE).toBe("glp1.diet");
  });
});
