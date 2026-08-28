import { teamAccessCodeSchema } from "./routers";
import { teamCodeAttemptConfig } from "./teams";
import { describe, expect, it } from "vitest";

describe("team access code validation", () => {
  it("accepts the issued TEAM-XXXX-XXXX access-code format", () => {
    expect(teamAccessCodeSchema.parse("team-a7x2-9kqm")).toBe("TEAM-A7X2-9KQM");
  });

  it("rejects malformed codes before an access attempt reaches the database", () => {
    expect(() => teamAccessCodeSchema.parse("A7X2-9KQM")).toThrow();
    expect(() => teamAccessCodeSchema.parse("TEAM-TOO-LONG-CODE")).toThrow();
  });

  it("limits invalid code attempts to five within a fifteen-minute window", () => {
    expect(teamCodeAttemptConfig()).toEqual({ maxAttempts: 5, windowMinutes: 15 });
  });
});
