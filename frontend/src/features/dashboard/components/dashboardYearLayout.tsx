import type { MockNusModule } from '../mockModules';
import { DashboardSemesterLayout } from './dashboardSemesterLayout';

type DashboardYearUserInfo = {
  matriculationYear: number;
};

type DashboardYearSemester = {
  semesterName: string;
  modules: MockNusModule[];
};

type DashboardYearLayoutProps = {
  yearNumber: number;
  userInfo: DashboardYearUserInfo;
  semesters: [DashboardYearSemester, DashboardYearSemester];
};

export function DashboardYearLayout({
  yearNumber,
  userInfo,
  semesters,
}: DashboardYearLayoutProps) {
  const academicYearStart = userInfo.matriculationYear + yearNumber - 1;
  const metricYear = `AY ${academicYearStart}/${academicYearStart + 1}`;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 text-gray-900 shadow-sm">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Year {yearNumber}</h2>
        <p className="mt-1 text-sm font-medium text-gray-500">{metricYear}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {semesters.map((semester) => (
          <DashboardSemesterLayout
            key={semester.semesterName}
            semesterName={semester.semesterName}
            modules={semester.modules}
          />
        ))}
      </div>
    </section>
  );
}
