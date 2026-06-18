'use client';

import { DashboardSemesterLayout, DashboardYearLayout, ExemptedModules, SelectedModules } from './components';
import type { SemesterKey, YearNumber } from './DashboardModuleSelectionContext';
import { useDashboardModuleSelection } from './DashboardModuleSelectionContext';

const mockUserInfo = {
  matriculationYear: 2026,
};

export function DashboardPage() {
  const { semesterModules } = useDashboardModuleSelection();
  const years: YearNumber[] = [1, 2, 3, 4];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Dashboard</h1>
            <p className="mt-2 text-sm font-medium text-gray-500">Search modules from the top bar, then drag them into your plan.</p>
          </div>

          <div className="text-right text-sm font-medium text-gray-500">
            <p>Dashboard Planner</p>
            <p>AY {mockUserInfo.matriculationYear}/{mockUserInfo.matriculationYear + 1} onward</p>
          </div>
        </div>
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5 lg:grid-cols-2">
          {years.map((yearNumber) => {
            const semesters = [1, 2].map((semesterNumber) => {
              const semesterKey = `year-${yearNumber}-semester-${semesterNumber}` as SemesterKey;

              return {
                semesterName: `Semester ${semesterNumber}`,
                semesterKey,
                modules: semesterModules[semesterKey],
              };
            });

            return (
              <section key={yearNumber} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <DashboardYearLayout yearNumber={yearNumber} userInfo={mockUserInfo} />

                <div className="mt-4 grid grid-cols-2 gap-4">
                  {semesters.map((semester) => (
                    <DashboardSemesterLayout
                      key={semester.semesterKey}
                      semesterName={semester.semesterName}
                      semesterKey={semester.semesterKey}
                      modules={semester.modules}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="grid h-full min-h-0 grid-rows-2 gap-5">
          <SelectedModules />
          <ExemptedModules />
        </div>
      </div>
    </div>
  );
}
