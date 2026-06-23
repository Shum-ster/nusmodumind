'use client';

import { DashboardActionButtons, DashboardYearLayout, ExemptedModules, SelectedModules } from './components';
import type { YearNumber } from './DashboardModuleSelectionContext';
import { useDashboardModuleSelection } from './DashboardModuleSelectionContext';

const mockUserInfo = {
  matriculationYear: 2026,
};

export function DashboardPage() {
  const { semesterModules } = useDashboardModuleSelection();
  const years: YearNumber[] = [1, 2, 3, 4];

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-950">Dashboard</h1>
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

      <div className="min-h-0 self-start xl:sticky xl:top-20">
        <SelectedModules />
      </div>
    </div>
  );
}
