'use client';

import { AlertTriangle } from 'lucide-react';
import type { SemesterKey } from '@/features/dashboard/DashboardModuleSelectionContext';
import { useDashboardModuleSelection } from '@/features/dashboard/DashboardModuleSelectionContext';
import type { DashboardModule } from '@/features/dashboard/types';
import { extractModuleCodes, formatDashboardSemesterLabel } from '../course-utils';

type CoursePreclusionAlertsProps = {
  preclusion?: string | null;
};

type PlannedDashboardModule = {
  location: string;
  module: DashboardModule;
  semesterKey?: SemesterKey;
};

function getDashboardModulesByCode({
  exemptedModules,
  selectedModules,
  semesterModules,
}: Pick<ReturnType<typeof useDashboardModuleSelection>, 'exemptedModules' | 'selectedModules' | 'semesterModules'>) {
  const modulesByCode = new Map<string, PlannedDashboardModule>();

  selectedModules.forEach((module) => {
    modulesByCode.set(module.code, { location: 'selected modules', module });
  });

  exemptedModules.forEach((module) => {
    modulesByCode.set(module.code, { location: 'exempted modules', module });
  });

  Object.entries(semesterModules).forEach(([semesterKey, modules]) => {
    modules.forEach((module) => {
      modulesByCode.set(module.code, {
        location: formatDashboardSemesterLabel(semesterKey as SemesterKey),
        module,
        semesterKey: semesterKey as SemesterKey,
      });
    });
  });

  return modulesByCode;
}

export function CoursePreclusionAlerts({ preclusion }: CoursePreclusionAlertsProps) {
  const dashboardSelection = useDashboardModuleSelection();
  const precludedModuleCodes = extractModuleCodes(preclusion);
  const modulesByCode = getDashboardModulesByCode(dashboardSelection);
  const matchedModules = precludedModuleCodes
    .map((moduleCode) => modulesByCode.get(moduleCode))
    .filter((module): module is PlannedDashboardModule => Boolean(module));

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-950">Preclusion</h2>
      {preclusion ? (
        <p className="mt-3 text-sm leading-6 text-gray-600">{preclusion}</p>
      ) : (
        <p className="mt-3 text-sm font-medium text-gray-500">No preclusions listed for this module.</p>
      )}

      {matchedModules.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {matchedModules.map(({ location, module }) => {
            const hasGrade = Boolean(module.actualGrade);

            return (
              <div
                key={`${module.code}-${location}`}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm font-medium ${
                  hasGrade
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-yellow-200 bg-yellow-50 text-yellow-800'
                }`}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span>
                  {hasGrade
                    ? `module ${module.code} has been taken in ${location} with grade ${module.actualGrade}.`
                    : `module ${module.code} is currently planned in ${location}.`}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
