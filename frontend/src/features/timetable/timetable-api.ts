import { getCurrentUserPlan } from "@/features/planner-api";

export type CurrentUserTimetable = {
  semester: TimetableSemester;
  modules: TimetableModule[];
};

export type TimetableSemester = {
  id: string;
  acadYear: string;
  semesterNumber: number;
  label: string;
};

export type TimetableModule = {
  plannedModuleId: string;
  semesterId: string;
  moduleCode: string;
  selectedLessons: TimetableLesson[];
  availableLessons: TimetableLesson[];
  examDate: string | null;
};

export type TimetableLesson = {
  id: string;
  moduleCode: string;
  lessonType: string;
  classNo: string;
  day: string;
  startTime: string;
  endTime: string;
  venue: string;
  weeks: string;
};

type SemesterDataEntry = {
  examDate?: unknown;
  semester?: unknown;
  timetable?: unknown;
};

type NusModsLesson = {
  classNo?: unknown;
  day?: unknown;
  endTime?: unknown;
  lessonType?: unknown;
  startTime?: unknown;
  venue?: unknown;
  weeks?: unknown;
};

type SelectedLessonsByType = Record<string, string>;

export async function getCurrentUserTimetable(
  token: string,
  semesterId: string,
): Promise<CurrentUserTimetable> {
  const plan = await getCurrentUserPlan(token);
  const semester = plan.semesters.find(
    (currentSemester) => currentSemester.id === semesterId,
  );

  if (!semester) {
    throw new Error("Semester not found in current user plan");
  }

  const timetableSemester: TimetableSemester = {
    id: semester.id,
    acadYear: semester.acadYear,
    semesterNumber: semester.semesterNumber,
    label: `AY${semester.acadYear} Semester ${semester.semesterNumber}`,
  };

  return {
    semester: timetableSemester,
    modules: plan.plannedModules
      .filter(
        (plannedModule) =>
          plannedModule.status === "PLANNED" &&
          plannedModule.semesterId === semesterId &&
          plannedModule.semester !== null,
      )
      .map((plannedModule) => {
        const semesterData = getMatchingSemesterData(
          plannedModule.module.semesterData,
          semester.semesterNumber,
        );
        const availableLessons = getAvailableLessons(
          plannedModule.moduleCode,
          semesterData,
        );

        return {
          plannedModuleId: plannedModule.id,
          semesterId,
          moduleCode: plannedModule.moduleCode,
          selectedLessons: getSelectedLessons(
            availableLessons,
            plannedModule.selectedLessons,
          ),
          availableLessons,
          examDate: getExamDate(semesterData),
        };
      }),
  };
}

function getMatchingSemesterData(
  semesterData: unknown,
  semesterNumber: number,
): SemesterDataEntry | null {
  if (!Array.isArray(semesterData)) {
    return null;
  }

  return (
    semesterData.find(
      (currentSemester): currentSemester is SemesterDataEntry =>
        isRecord(currentSemester) &&
        Number(currentSemester.semester) === semesterNumber,
    ) ?? null
  );
}

function getAvailableLessons(
  moduleCode: string,
  semesterData: SemesterDataEntry | null,
) {
  if (!Array.isArray(semesterData?.timetable)) {
    return [];
  }

  return semesterData.timetable
    .map((lesson) => normalizeLesson(moduleCode, lesson))
    .filter((lesson): lesson is TimetableLesson => lesson !== null);
}

function normalizeLesson(moduleCode: string, lesson: unknown) {
  if (!isRecord(lesson)) {
    return null;
  }

  const nusModsLesson = lesson as NusModsLesson;
  const lessonType = toRequiredString(nusModsLesson.lessonType);
  const classNo = toRequiredString(nusModsLesson.classNo);
  const day = toRequiredString(nusModsLesson.day);
  const startTime = toRequiredString(nusModsLesson.startTime);
  const endTime = toRequiredString(nusModsLesson.endTime);
  const venue = toRequiredString(nusModsLesson.venue);

  if (!lessonType || !classNo || !day || !startTime || !endTime || !venue) {
    return null;
  }

  return {
    id: buildLessonId({
      moduleCode,
      lessonType,
      classNo,
      day,
      startTime,
      endTime,
      venue,
    }),
    moduleCode,
    lessonType,
    classNo,
    day,
    startTime,
    endTime,
    venue,
    weeks: stringifyWeeks(nusModsLesson.weeks),
  };
}

function getSelectedLessons(
  availableLessons: TimetableLesson[],
  selectedLessons: unknown,
) {
  const selections = normalizeSelectedLessons(selectedLessons);
  const defaultLessonsByType = new Map<string, TimetableLesson>();

  availableLessons.forEach((lesson) => {
    if (!defaultLessonsByType.has(lesson.lessonType)) {
      defaultLessonsByType.set(lesson.lessonType, lesson);
    }
  });

  return Array.from(defaultLessonsByType.entries()).map(
    ([lessonType, defaultLesson]) =>
      availableLessons.find(
        (lesson) =>
          lesson.lessonType === lessonType &&
          lesson.classNo === selections[lessonType],
      ) ?? defaultLesson,
  );
}

function normalizeSelectedLessons(selectedLessons: unknown): SelectedLessonsByType {
  if (!isRecord(selectedLessons)) {
    return {};
  }

  return Object.entries(selectedLessons).reduce<SelectedLessonsByType>(
    (selections, [lessonType, classNo]) => {
      if (typeof classNo === "string" && classNo.trim()) {
        selections[lessonType] = classNo;
      }

      return selections;
    },
    {},
  );
}

function getExamDate(semesterData: SemesterDataEntry | null) {
  return typeof semesterData?.examDate === "string"
    ? semesterData.examDate
    : null;
}

function buildLessonId({
  moduleCode,
  lessonType,
  classNo,
  day,
  startTime,
  endTime,
  venue,
}: Omit<TimetableLesson, "id" | "weeks">) {
  return [
    moduleCode,
    lessonType,
    classNo,
    day,
    startTime,
    endTime,
    venue,
  ]
    .map((value) => encodeURIComponent(value))
    .join("-");
}

function stringifyWeeks(weeks: unknown) {
  if (typeof weeks === "string") {
    return weeks;
  }

  if (weeks === undefined || weeks === null) {
    return "";
  }

  if (Array.isArray(weeks)) {
    return weeks.map(String).join(",");
  }

  if (typeof weeks === "number" || typeof weeks === "boolean") {
    return String(weeks);
  }

  return JSON.stringify(weeks);
}

function toRequiredString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
