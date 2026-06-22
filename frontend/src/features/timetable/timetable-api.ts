import {
  getCurrentUserPlan,
  type PlannedModuleRecord,
  type SemesterRecord,
} from "@/features/planner-api";

export type TimetablePlannedModuleRecord = PlannedModuleRecord & {
  status: "PLANNED";
  semesterId: string;
  semester: SemesterRecord;
};

export type CurrentUserTimetable = {
  semesters: SemesterRecord[];
  plannedModules: TimetablePlannedModuleRecord[];
};

export async function getCurrentUserTimetable(
  token: string,
): Promise<CurrentUserTimetable> {
  const plan = await getCurrentUserPlan(token);

  return {
    semesters: plan.semesters,
    plannedModules: plan.plannedModules.filter(
      (plannedModule): plannedModule is TimetablePlannedModuleRecord =>
        plannedModule.status === "PLANNED" &&
        plannedModule.semesterId !== null &&
        plannedModule.semester !== null,
    ),
  };
}
