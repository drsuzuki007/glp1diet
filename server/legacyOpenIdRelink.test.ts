import { describe, expect, it } from "vitest";
import { chooseLegacyRowToRelink } from "./db";

const NEW_OPEN_ID = "google:1234567890";

describe("chooseLegacyRowToRelink", () => {
  it("adopts the single pre-migration row that shares the email", () => {
    const row = chooseLegacyRowToRelink([{ id: 7, openId: "manus_abc" }], NEW_OPEN_ID);
    expect(row).toEqual({ id: 7, openId: "manus_abc" });
  });

  it("does nothing when the account has already been migrated", () => {
    expect(
      chooseLegacyRowToRelink([{ id: 7, openId: NEW_OPEN_ID }], NEW_OPEN_ID)
    ).toBeNull();
  });

  it("does nothing when no row matches", () => {
    expect(chooseLegacyRowToRelink([], NEW_OPEN_ID)).toBeNull();
  });

  it("refuses to guess when two legacy rows share the email", () => {
    expect(
      chooseLegacyRowToRelink(
        [
          { id: 7, openId: "manus_abc" },
          { id: 9, openId: "manus_def" },
        ],
        NEW_OPEN_ID
      )
    ).toBeNull();
  });

  it("ignores other Google accounts that already migrated", () => {
    const row = chooseLegacyRowToRelink(
      [
        { id: 7, openId: "manus_abc" },
        { id: 9, openId: "google:999" },
      ],
      NEW_OPEN_ID
    );
    expect(row).toEqual({ id: 7, openId: "manus_abc" });
  });
});
