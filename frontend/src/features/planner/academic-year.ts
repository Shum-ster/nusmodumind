import type {
  SemesterKey,
  SemesterNumber,
  SemesterRecord,
  YearNumber,
} from '@/shared/types';

export const defaultMatriculationYear = 2026;
export const planDurationYears = 4;

export function getEffectiveMatriculationYear(profile: {
  graduationYear?: number | null;
  matriculationYear?: number | null;
} | null) {
  return (
    profile?.matriculationYear ??
    (profile?.graduationYear
      ? profile.graduationYear - planDurationYears
      : defaultMatriculationYear)
  );
}

export function parseSemesterKey(semesterKey: SemesterKey) {
  const [, year, , semester] = semesterKey.split('-');

  return {
    semesterNumber: Number(semester) as SemesterNumber,
    yearNumber: Number(year) as YearNumber,
  };
}

export function getAcademicYearStart(acadYear: string) {
  const yearMatch = acadYear.match(/^\s*(\d{4})\s*\/\s*(\d{4})\s*$/);

  if (!yearMatch) {
    return null;
  }

  const startYear = Number(yearMatch[1]);
  const endYear = Number(yearMatch[2]);

  return endYear === startYear + 1 ? startYear : null;
}

export function getAcadYearForSemesterKey(
  semesterKey: SemesterKey,
  matriculationYear: number,
) {
  const { yearNumber } = parseSemesterKey(semesterKey);
  const academicYearStart = matriculationYear + yearNumber - 1;

  return `${academicYearStart}/${academicYearStart + 1}`;
}

export function getSemesterKeyFromRecord(
  semester: SemesterRecord,
  matriculationYear: number,
): SemesterKey | null {
  const academicYearStart = getAcademicYearStart(semester.acadYear);

  if (
    academicYearStart === null ||
    (semester.semesterNumber !== 1 && semester.semesterNumber !== 2)
  ) {
    return null;
  }

  const yearNumber = academicYearStart - matriculationYear + 1;

  if (yearNumber < 1 || yearNumber > planDurationYears) {
    return null;
  }

  return `year-${yearNumber as YearNumber}-semester-${semester.semesterNumber as SemesterNumber}`;
}

export type PlanSemesterOption = {
  id: string | null;
  acadYear: string;
  label: string;
  semester: SemesterNumber;
  year: YearNumber;
};

export function buildPlanSemesterOptions(
  semesters: SemesterRecord[],
  matriculationYear: number,
): PlanSemesterOption[] {
  const years: YearNumber[] = [1, 2, 3, 4];
  const semesterNumbers: SemesterNumber[] = [1, 2];

  return years.flatMap((year) =>
    semesterNumbers.map((semesterNumber) => {
      const academicYearStart = matriculationYear + year - 1;
      const acadYear = `${academicYearStart}/${academicYearStart + 1}`;
      const matchingSavedSemester = semesters.find(
        (semester) =>
          getAcademicYearStart(semester.acadYear) === academicYearStart &&
          semester.semesterNumber === semesterNumber,
      );

      return {
        id: matchingSavedSemester?.id ?? null,
        acadYear,
        label: `AY${acadYear} Semester ${semesterNumber}`,
        semester: semesterNumber,
        year,
      };
    }),
  );
}
