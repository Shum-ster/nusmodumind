'use client';

import { GitBranch } from 'lucide-react';
import { useMemo } from 'react';
import type { SemesterKey } from '@/features/dashboard/DashboardModuleSelectionContext';
import { useDashboardModuleSelection } from '@/features/dashboard/DashboardModuleSelectionContext';
import type { DashboardModule } from '@/features/dashboard/types';
import type { NusModuleDetail } from '../courses-api';
import { extractModuleCodes, formatDashboardSemesterLabel, parsePrerequisiteGroups } from '../course-utils';

type PrerequisiteTreeProps = {
  module: NusModuleDetail;
};

type ModuleStatus = 'completed' | 'missing' | 'planned';

type DashboardModulePlacement = {
  location: string;
  module: DashboardModule;
  semesterKey?: SemesterKey;
  status: Exclude<ModuleStatus, 'missing'>;
};

type ModulePillProps = {
  code: string;
  location?: string;
  status?: ModuleStatus;
  title?: string;
};

function getSemesterOrder(semesterKey: SemesterKey) {
  const [, yearText, , semesterText] = semesterKey.split('-');
  const yearNumber = Number(yearText);
  const semesterNumber = Number(semesterText);

  return (yearNumber - 1) * 2 + semesterNumber;
}

function getPillClassName(status: ModuleStatus = 'missing') {
  if (status === 'completed') {
    return 'border-green-200 bg-green-50 text-green-900';
  }

  if (status === 'planned') {
    return 'border-yellow-200 bg-yellow-50 text-yellow-900';
  }

  return 'border-red-200 bg-red-50 text-red-900';
}

function getStatusTextClassName(status: ModuleStatus = 'missing') {
  if (status === 'completed') {
    return 'text-green-700';
  }

  if (status === 'planned') {
    return 'text-yellow-700';
  }

  return 'text-red-700';
}

function ModulePill({ code, location, status = 'missing', title }: ModulePillProps) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${getPillClassName(status)}`}>
      <p className="text-sm font-bold">{code}</p>
      {title ? <p className="mt-0.5 truncate text-xs font-medium opacity-80">{title}</p> : null}
      <p className={`mt-1 text-xs font-bold uppercase ${getStatusTextClassName(status)}`}>
        {status}
      </p>
      {location ? <p className="mt-0.5 text-xs font-medium opacity-80">{location}</p> : null}
    </div>
  );
}

export function PrerequisiteTree({ module }: PrerequisiteTreeProps) {
  const {
    completedSemesterKeys,
    exemptedModules,
    selectedModules,
    semesterModules,
  } = useDashboardModuleSelection();
  const prerequisiteGroups = useMemo(() => parsePrerequisiteGroups(module.prerequisite), [module.prerequisite]);
  const dashboardModulesByCode = useMemo(() => {
    const modulesByCode = new Map<string, DashboardModulePlacement>();

    selectedModules.forEach((currentModule) => {
      modulesByCode.set(currentModule.code, {
        location: 'Selected Modules',
        module: currentModule,
        status: currentModule.actualGrade ? 'completed' : 'planned',
      });
    });

    exemptedModules.forEach((currentModule) => {
      modulesByCode.set(currentModule.code, {
        location: 'Exempted Modules',
        module: currentModule,
        status: 'completed',
      });
    });

    Object.entries(semesterModules).forEach(([semesterKey, modules]) => {
      const typedSemesterKey = semesterKey as SemesterKey;
      const isCompletedSemester = completedSemesterKeys[typedSemesterKey];

      modules.forEach((currentModule) => {
        modulesByCode.set(currentModule.code, {
          location: formatDashboardSemesterLabel(typedSemesterKey),
          module: currentModule,
          semesterKey: typedSemesterKey,
          status: isCompletedSemester || currentModule.actualGrade ? 'completed' : 'planned',
        });
      });
    });

    return modulesByCode;
  }, [completedSemesterKeys, exemptedModules, selectedModules, semesterModules]);
  const currentModulePlacement = dashboardModulesByCode.get(module.moduleCode);
  const currentModuleSemesterOrder = currentModulePlacement?.semesterKey
    ? getSemesterOrder(currentModulePlacement.semesterKey)
    : null;
  const dashboardUnlockModules = useMemo(() => {
    const selectedUnlockModules = selectedModules
      .filter((currentModule) => currentModule.code !== module.moduleCode)
      .filter((currentModule) => extractModuleCodes(currentModule.prerequisite).includes(module.moduleCode))
      .map((currentModule) => ({
        location: 'Selected Modules',
        module: currentModule,
        status: 'planned' as const,
      }));
    const semesterUnlockModules = Object.entries(semesterModules).flatMap(([semesterKey, modules]) => {
      const typedSemesterKey = semesterKey as SemesterKey;

      if (completedSemesterKeys[typedSemesterKey]) {
        return [];
      }

      if (currentModuleSemesterOrder !== null && getSemesterOrder(typedSemesterKey) <= currentModuleSemesterOrder) {
        return [];
      }

      return modules
        .filter((currentModule) => currentModule.code !== module.moduleCode)
        .filter((currentModule) => extractModuleCodes(currentModule.prerequisite).includes(module.moduleCode))
        .map((currentModule) => ({
          location: formatDashboardSemesterLabel(typedSemesterKey),
          module: currentModule,
          status: currentModule.actualGrade ? 'completed' as const : 'planned' as const,
        }));
    });

    return [...selectedUnlockModules, ...semesterUnlockModules];
  }, [completedSemesterKeys, currentModuleSemesterOrder, module.moduleCode, selectedModules, semesterModules]);
  const getPrerequisiteCodeStatus = (code: string): ModuleStatus => (
    dashboardModulesByCode.get(code)?.status ?? 'missing'
  );
  const groupIsCompleted = (codes: string[]) => codes.some((code) => getPrerequisiteCodeStatus(code) === 'completed');
  const groupIsPlanned = (codes: string[]) => codes.some((code) => getPrerequisiteCodeStatus(code) === 'planned');
  const hasPrerequisites = prerequisiteGroups.length > 0;
  const allPrerequisitesCompleted = hasPrerequisites
    && prerequisiteGroups.every((group) => groupIsCompleted(group.codes));
  const allPrerequisitesPlannedOrCompleted = hasPrerequisites
    && prerequisiteGroups.every((group) => groupIsCompleted(group.codes) || groupIsPlanned(group.codes));
  const currentModuleStatus: ModuleStatus = !hasPrerequisites || allPrerequisitesCompleted
    ? 'completed'
    : allPrerequisitesPlannedOrCompleted
      ? 'planned'
      : 'missing';

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-orange-600" />
        <h2 className="text-lg font-bold text-gray-950">Prerequisite Tree</h2>
      </div>

      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-900">Before this module</h3>
            {prerequisiteGroups.length > 1 ? (
              <span className="rounded border border-gray-200 px-2 py-1 text-xs font-bold uppercase text-gray-500">
                all of
              </span>
            ) : null}
          </div>

          {prerequisiteGroups.length > 0 ? (
            prerequisiteGroups.map((group, groupIndex) => (
              <div key={`${group.relation}-${groupIndex}`} className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase text-orange-600">{group.relation}</p>
                <div className="grid gap-2">
                  {group.codes.map((code) => {
                    const placement = dashboardModulesByCode.get(code);

                    return (
                      <ModulePill
                        key={code}
                        code={code}
                        location={placement?.location}
                        status={placement?.status ?? 'missing'}
                        title={placement?.module.title}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm font-medium text-gray-500">
              No prerequisites listed.
            </p>
          )}
        </div>

        <div className="relative flex min-h-28 items-center justify-center">
          <div className="absolute left-0 right-0 top-1/2 hidden h-px bg-gray-300 lg:block" />
          <div className={`relative rounded-lg border-2 px-4 py-3 text-center shadow-sm ${getPillClassName(currentModuleStatus)}`}>
            <p className="text-sm font-bold">{module.moduleCode}</p>
            <p className="mt-1 text-xs font-medium opacity-80">{module.title}</p>
            <p className={`mt-2 text-xs font-bold uppercase ${getStatusTextClassName(currentModuleStatus)}`}>
              {currentModuleStatus === 'completed' ? 'ready' : currentModuleStatus}
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <h3 className="text-sm font-bold text-gray-900">Unlocks after this module</h3>
          {dashboardUnlockModules.length > 0 ? (
            <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
              {dashboardUnlockModules.map(({ location, module: currentModule, status }) => (
                <ModulePill
                  key={`${currentModule.code}-${location}`}
                  code={currentModule.code}
                  location={location}
                  status={status}
                  title={currentModule.title}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm font-medium text-gray-500">
              No selected or future dashboard modules list this module as a prerequisite.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
