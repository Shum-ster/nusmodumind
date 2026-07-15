import type {
  CurrentUserPlan,
  CurrentUserTimetable,
  NusModsLesson,
  NusModsSemesterData,
  SelectedLessonsByType,
  TimetableLesson,
  TimetableSemester,
} from "@/shared/types";

export type {
  CurrentUserTimetable,
  TimetableLesson,
  TimetableModule,
  TimetableSemester,
} from "@/shared/types";

export function buildCurrentUserTimetable(
  plan: CurrentUserPlan,
  semesterId: string,
): CurrentUserTimetable {
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
): NusModsSemesterData | null {
  if (!Array.isArray(semesterData)) {
    return null;
  }

  return (
    semesterData.find(
      (currentSemester): currentSemester is NusModsSemesterData =>
        isRecord(currentSemester) &&
        Number(currentSemester.semester) === semesterNumber,
    ) ?? null
  );
}

function getAvailableLessons(
  moduleCode: string,
  semesterData: NusModsSemesterData | null,
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
  const lessonsByType = new Map<string, TimetableLesson[]>();

  availableLessons.forEach((lesson) => {
    const currentLessons = lessonsByType.get(lesson.lessonType) ?? [];
    lessonsByType.set(lesson.lessonType, [...currentLessons, lesson]);
  });

  return Array.from(lessonsByType.entries()).flatMap(
    ([lessonType, lessons]) => {
      const selectedClassNo = selections[lessonType] ?? lessons[0]?.classNo;
      const selectedTypeLessons = lessons.filter(
        (lesson) => lesson.classNo === selectedClassNo,
      );

      return selectedTypeLessons.length > 0 ? selectedTypeLessons : lessons.slice(0, 1);
    },
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

function getExamDate(semesterData: NusModsSemesterData | null) {
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
    return stringifyWeekList(weeks);
  }

  if (weeks === undefined || weeks === null) {
    return "";
  }

  if (Array.isArray(weeks)) {
    return stringifyWeekList(weeks);
  }

  if (typeof weeks === "number" || typeof weeks === "boolean") {
    return String(weeks);
  }

  return JSON.stringify(weeks);
}

function stringifyWeekList(weeks: string | unknown[]) {
  const rawWeekLabels = (typeof weeks === "string"
    ? weeks.split(",")
    : weeks.map(String))
    .map((week) => week.trim())
    .filter(Boolean);

  if (rawWeekLabels.length === 0) {
    return "";
  }

  if (rawWeekLabels.some((week) => !/^\d+$/.test(week))) {
    return typeof weeks === "string" ? weeks : weeks.map(String).join(", ");
  }

  const weekNumbers = rawWeekLabels.map(Number);
  const sortedWeeks = Array.from(new Set(weekNumbers))
    .sort((firstWeek, secondWeek) => firstWeek - secondWeek);
  const weekRanges: string[] = [];
  let rangeStart = sortedWeeks[0];
  let previousWeek = sortedWeeks[0];

  for (const week of sortedWeeks.slice(1)) {
    if (week === previousWeek + 1) {
      previousWeek = week;
      continue;
    }

    weekRanges.push(formatWeekRange(rangeStart, previousWeek));
    rangeStart = week;
    previousWeek = week;
  }

  weekRanges.push(formatWeekRange(rangeStart, previousWeek));

  return weekRanges.join(", ");
}

function formatWeekRange(startWeek: number, endWeek: number) {
  return startWeek === endWeek ? String(startWeek) : `${startWeek} - ${endWeek}`;
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
