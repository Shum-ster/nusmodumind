import { describe, expect, it } from "vitest";
import {
  getPopularChoiceDegree,
  getPopularChoiceDegreeFilterValues,
  getPopularChoiceFaculty,
  getPopularChoiceFacultyFilterValues,
  getPopularChoiceFacultyForProfile,
  popularChoiceFaculties,
} from "./popularChoicesData";

describe("Popular Choices data", () => {
  it("resolves current and legacy faculty identifiers", () => {
    expect(getPopularChoiceFaculty("computing")?.title).toBe(
      "School of Computing",
    );
    expect(getPopularChoiceFaculty("science")?.id).toBe("science");
  });

  it("resolves legacy degree names to the current selection", () => {
    expect(
      getPopularChoiceFacultyForProfile("Computing", "Computer Science")?.id,
    ).toBe("computing");
    expect(
      getPopularChoiceDegree(
        "computing",
        "computer-science",
      )?.title,
    ).toBe("Computer Science");
    expect(
      getPopularChoiceFacultyForProfile(
        "College of Humanities and Sciences",
        "Mathematics",
      )?.id,
    ).toBe("science");
  });

  it("builds unique backend filter values", () => {
    const computing = popularChoiceFaculties.find(
      (faculty) => faculty.id === "computing",
    );
    const computerScience = computing?.degrees.find(
      (degree) => degree.id === "computer-science",
    );

    expect(getPopularChoiceFacultyFilterValues(computing!)).toEqual([
      "School of Computing",
      "Computing",
    ]);
    expect(getPopularChoiceDegreeFilterValues(computerScience!)).toContain(
      "Computer Science",
    );
  });

  it("contains the expected explicit majors under their current faculties", () => {
    const majorsByFaculty = new Map(
      popularChoiceFaculties.map((faculty) => [
        faculty.title,
        faculty.degrees.map((degree) => degree.title),
      ]),
    );

    expect(majorsByFaculty.get("NUS Business School")).toContain("Finance");
    expect(majorsByFaculty.get("School of Computing")).toContain(
      "Computer Science",
    );
    expect(
      majorsByFaculty.get("College of Design and Engineering"),
    ).toContain("Mechanical Engineering");
    expect(
      majorsByFaculty.get("Faculty of Arts and Social Sciences"),
    ).toContain("Psychology");
    expect(majorsByFaculty.get("Faculty of Science")).toEqual(
      expect.arrayContaining(["Mathematics", "Pharmacy"]),
    );
    expect(
      majorsByFaculty.get("Yong Loo Lin School of Medicine"),
    ).toContain("Nursing");
  });
});
