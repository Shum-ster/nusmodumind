import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractModuleCodes,
  fetchAllNusModules,
  formatCourseDateTime,
  formatDashboardSemesterLabel,
  getSemesterData,
  parsePrerequisiteGroups,
} from "./course-utils";
import { searchNusModules } from "./courses-api";

vi.mock("./courses-api", () => ({
  searchNusModules: vi.fn(),
}));

describe("course utilities", () => {
  beforeEach(() => vi.mocked(searchNusModules).mockReset());

  it("extracts unique NUS module codes", () => {
    expect(
      extractModuleCodes("Complete CS1010S, CS2030S, then CS1010S again"),
    ).toEqual(["CS1010S", "CS2030S"]);
  });

  it("parses prerequisite AND/OR groups", () => {
    expect(parsePrerequisiteGroups("CS1010S AND (MA1521 OR MA2002)")).toEqual([
      { codes: ["CS1010S"], relation: "all of" },
      { codes: ["MA1521", "MA2002"], relation: "one of" },
    ]);
  });

  it("safely handles invalid semester data", () => {
    expect(getSemesterData(null)).toEqual([]);
    expect(getSemesterData({ semester: 1 })).toEqual([]);
    expect(getSemesterData([{ semester: 1 }])).toEqual([{ semester: 1 }]);
  });

  it("formats dashboard semester labels", () => {
    expect(formatDashboardSemesterLabel("year-2-semester-1")).toBe(
      "year 2 semester 1",
    );
  });

  it("keeps invalid date text and formats valid dates", () => {
    expect(formatCourseDateTime("not-a-date")).toBe("not-a-date");
    expect(formatCourseDateTime(null)).toBeNull();
    expect(formatCourseDateTime("2026-07-25T04:30:00.000Z")).toContain(
      "25 July 2026",
    );
  });

  it("loads every cursor page", async () => {
    vi.mocked(searchNusModules)
      .mockResolvedValueOnce({
        items: [
          {
            moduleCode: "CS1010S",
            sourceAcadYear: "2026/2027",
            title: "Programming Methodology",
            faculty: "School of Computing",
            department: "Computer Science",
            moduleCredit: "4",
            gradingBasisDescription: "Graded",
          },
        ],
        nextCursor: "CS1010S",
      })
      .mockResolvedValueOnce({
        items: [
          {
            moduleCode: "CS2030S",
            sourceAcadYear: "2026/2027",
            title: "Programming Methodology II",
            faculty: "School of Computing",
            department: "Computer Science",
            moduleCredit: "4",
            gradingBasisDescription: "Graded",
          },
        ],
        nextCursor: null,
      });

    await expect(fetchAllNusModules()).resolves.toHaveLength(2);
    expect(searchNusModules).toHaveBeenNthCalledWith(2, {
      cursor: "CS1010S",
      limit: 50,
    });
  });
});
