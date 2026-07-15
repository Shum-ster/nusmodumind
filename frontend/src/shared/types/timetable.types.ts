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
