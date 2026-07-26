import { describe, expect, it } from "vitest";
import type { DashboardModule } from "@/shared/types";
import {
  calculateGpa,
  formatGpa,
  getGradePoint,
  isGradePassingPrerequisite,
  isModuleCsCuGraded,
  isModuleSuEligible,
  normalizeDashboardGrade,
  normalizeModuleActualGrade,
} from "./dashboard-grades";

function moduleWith(
  code: string,
  actualGrade: DashboardModule["actualGrade"],
  credits = 4,
): DashboardModule {
  return {
    actualGrade,
    code,
    credits,
    estimatedWorkload: 10,
    faculty: "Computing",
    title: code,
  };
}

describe("dashboard grades", () => {
  it("normalizes valid grades and rejects unsupported values", () => {
    expect(normalizeDashboardGrade(" a- ")).toBe("A-");
    expect(normalizeDashboardGrade("pass")).toBeNull();
    expect(normalizeDashboardGrade(null)).toBeNull();
  });

  it("keeps CS/CU only for CS/CU modules", () => {
    expect(normalizeModuleActualGrade("CS", "CS/CU")).toBe("CS");
    expect(normalizeModuleActualGrade("A", "CS/CU")).toBeNull();
    expect(normalizeModuleActualGrade("CS", "Graded")).toBeNull();
  });

  it("maps letter grades to points but excludes non-GPA grades", () => {
    expect(getGradePoint("A")).toBe(5);
    expect(getGradePoint("B+")).toBe(4);
    expect(getGradePoint("S")).toBeNull();
    expect(getGradePoint("CS")).toBeNull();
  });

  it("calculates a credit-weighted GPA", () => {
    const modules = [
      moduleWith("CS1010S", "A", 4),
      moduleWith("CS2030S", "B", 4),
      moduleWith("CFG1002", "CS", 2),
      moduleWith("CS2100", null, 4),
    ];

    expect(calculateGpa(modules)).toBe(4.25);
    expect(formatGpa(calculateGpa(modules))).toBe("4.25");
    expect(formatGpa(null)).toBe("--");
  });

  it("handles prerequisite pass/fail semantics", () => {
    expect(isGradePassingPrerequisite("S")).toBe(true);
    expect(isGradePassingPrerequisite("F")).toBe(false);
    expect(isGradePassingPrerequisite("U")).toBe(false);
    expect(isGradePassingPrerequisite("CU")).toBe(false);
  });

  it("detects grading attributes", () => {
    expect(isModuleSuEligible({ su: true })).toBe(true);
    expect(isModuleSuEligible({ su: false })).toBe(false);
    expect(isModuleCsCuGraded("Completed Satisfactory/Unsatisfactory")).toBe(
      true,
    );
  });
});
