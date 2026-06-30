'use client';

import { DashboardActionButtons, DashboardYearLayout, ExemptedModules, SelectedModules } from './components';
import type { SemesterKey, YearNumber } from './DashboardModuleSelectionContext';
import { useDashboardModuleSelection } from './DashboardModuleSelectionContext';
import { calculateGpa, formatGpa } from './dashboard-grades';

const mockUserInfo = {
  matriculationYear: 2026,
};

export function DashboardPage() {
  const { completedSemesterKeys, semesterModules } = useDashboardModuleSelection();
  const years: YearNumber[] = [1, 2, 3, 4];
  const completedModules = Object.entries(semesterModules).flatMap(([semesterKey, modules]) => (
    completedSemesterKeys[semesterKey as SemesterKey] ? modules : []
  ));
  const cumulativeGpa = calculateGpa(completedModules);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-950">Dashboard</h1>
                <div className="rounded border border-green-200 bg-green-50 px-3 py-1 text-sm font-bold text-green-800">
                  CAP {formatGpa(cumulativeGpa)}
                </div>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-500">Search modules from the top bar, then drag them into your plan.</p>
            </div>

            <div className="flex flex-wrap items-start justify-end gap-4">
              <DashboardActionButtons />
            </div>
          </div>
        </div>

        {years.map((yearNumber) => (
          <DashboardYearLayout
            key={yearNumber}
            yearNumber={yearNumber}
            userInfo={mockUserInfo}
            semesterModules={semesterModules}
          />
        ))}
        <ExemptedModules />
      </div>

      <div className="min-h-0 self-start xl:sticky xl:top-[5.5rem]">
        <SelectedModules />
      </div>
    </div>
  );
}
