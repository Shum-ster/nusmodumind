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
    expect(getPopularChoiceFaculty("science")?.id).toBe(
      "humanities-and-sciences",
    );
  });

  it("resolves legacy degree names to the current selection", () => {
    expect(
      getPopularChoiceFacultyForProfile("Computing", "Computer Science")?.id,
    ).toBe("computing");
    expect(
      getPopularChoiceDegree(
        "computing",
        "common-computer-science-programmes",
      )?.title,
    ).toBe("Common Computer Science Programmes");
  });

  it("builds unique backend filter values", () => {
    const computing = popularChoiceFaculties.find(
      (faculty) => faculty.id === "computing",
    );
    const computerScience = computing?.degrees.find(
      (degree) => degree.id === "common-computer-science-programmes",
    );

    expect(getPopularChoiceFacultyFilterValues(computing!)).toEqual([
      "School of Computing",
      "Computing",
    ]);
    expect(getPopularChoiceDegreeFilterValues(computerScience!)).toContain(
      "Computer Science",
    );
  });
});
