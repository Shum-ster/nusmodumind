import type { SemesterKey, SemesterNumber, YearNumber } from '../../DashboardModuleSelectionContext';
import type { DashboardModule } from '../../types';
import { DashboardSemesterLayout } from './DashboardSemesterLayout';

type DashboardYearUserInfo = {
  matriculationYear: number;
};

type DashboardYearLayoutProps = {
  semesterModules: Record<SemesterKey, DashboardModule[]>;
  userInfo: DashboardYearUserInfo;
  yearNumber: YearNumber;
};

const semesters: SemesterNumber[] = [1, 2];

export function DashboardYearLayout({
  semesterModules,
  userInfo,
  yearNumber,
}: DashboardYearLayoutProps) {
  const academicYearStart = userInfo.matriculationYear + yearNumber - 1;
  const metricYear = `AY ${academicYearStart}/${academicYearStart + 1}`;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Year {yearNumber}</h2>
          <p className="mt-1 text-sm font-medium text-gray-500">{metricYear}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {semesters.map((semesterNumber) => {
          const semesterKey = `year-${yearNumber}-semester-${semesterNumber}` as SemesterKey;

          return (
            <DashboardSemesterLayout
              key={semesterKey}
              semesterName={`Semester ${semesterNumber}`}
              semesterKey={semesterKey}
              modules={semesterModules[semesterKey]}
            />
          );
        })}
      </div>
    </section>
  );
}
