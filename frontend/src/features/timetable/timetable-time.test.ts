import { describe, expect, it } from "vitest";
import { formatSingaporeTimetableTime } from "./timetable-time";

describe("formatSingaporeTimetableTime", () => {
  it.each([
    ["0000", "12am"],
    ["0830", "8:30am"],
    ["1200", "12pm"],
    ["2359", "11:59pm"],
  ])("formats compact time %s", (input, expected) => {
    expect(formatSingaporeTimetableTime(input)).toBe(expected);
  });

  it("formats zoned timestamps in Singapore time", () => {
    expect(formatSingaporeTimetableTime("2026-07-25T00:30:00Z")).toBe(
      "25 Jul 2026, 8:30am",
    );
  });

  it("returns unrecognised input unchanged", () => {
    expect(formatSingaporeTimetableTime("25:90")).toBe("25:90");
  });
});
