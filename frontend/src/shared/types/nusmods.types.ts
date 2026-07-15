export type NusModsSemesterData = {
  examDate?: unknown;
  examDuration?: unknown;
  semester?: unknown;
  timetable?: unknown;
};

export type NusModsLesson = {
  classNo?: unknown;
  day?: unknown;
  endTime?: unknown;
  lessonType?: unknown;
  startTime?: unknown;
  venue?: unknown;
  weeks?: unknown;
};

export type SelectedLessonsByType = Record<string, string>;
