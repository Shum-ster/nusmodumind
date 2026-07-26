import { describe, expect, it } from "vitest";
import type { DashboardModule, SemesterKey } from "@/shared/types";
import { buildUnsatisfiedModuleIssues } from "./dashboard-validation";

function makeModule(
  code: string,
  options: Partial<DashboardModule> = {},
): DashboardModule {
  return {
    code,
    credits: 4,
    estimatedWorkload: 10,
    faculty: "Computing",
    title: code,
    ...options,
  };
}

const emptySemesters = {
  "year-1-semester-1": [],
  "year-1-semester-2": [],
  "year-2-semester-1": [],
  "year-2-semester-2": [],
  "year-3-semester-1": [],
  "year-3-semester-2": [],
  "year-4-semester-1": [],
  "year-4-semester-2": [],
} satisfies Record<SemesterKey, DashboardModule[]>;

describe("dashboard validation", () => {
  it("reports an unmet prerequisite", () => {
    const dashboardModule = makeModule("CS2030S", {
      prerequisite: "CS1010S",
    });

    expect(
      buildUnsatisfiedModuleIssues({
        exemptedModules: [],
        modules: [dashboardModule],
        semesterKey: "year-2-semester-1",
        semesterModules: emptySemesters,
      }),
    ).toEqual([
      {
        moduleCode: "CS2030S",
        reasons: ["Prerequisite not satisfied. Complete one of CS1010S first."],
      },
    ]);
  });

  it("accepts a passed module from an earlier semester", () => {
    const semesterModules = {
      ...emptySemesters,
      "year-1-semester-1": [makeModule("CS1010S", { actualGrade: "S" })],
    };

    expect(
      buildUnsatisfiedModuleIssues({
        exemptedModules: [],
        modules: [makeModule("CS2030S", { prerequisite: "CS1010S" })],
        semesterKey: "year-2-semester-1",
        semesterModules,
      }),
    ).toEqual([]);
  });

  it("reports exam clashes for both modules", () => {
    const semesterData = [
      { examDate: "2026-11-30T01:00:00.000Z", semester: 1 },
    ];
    const modules = [
      makeModule("CS2100", { semesterData }),
      makeModule("CS2103T", { semesterData }),
    ];

    expect(
      buildUnsatisfiedModuleIssues({
        exemptedModules: [],
        modules,
        semesterKey: "year-2-semester-1",
        semesterModules: emptySemesters,
      }),
    ).toEqual(
      expect.arrayContaining([
        {
          moduleCode: "CS2100",
          reasons: ["Exam timing clashes with CS2103T."],
        },
        {
          moduleCode: "CS2103T",
          reasons: ["Exam timing clashes with CS2100."],
        },
      ]),
    );
  });
});
