'use client';

import type { DragEvent } from 'react';
import { NusModuleSearchBar, type NusModuleListItem } from '@/features/courses';
import { useDashboardModuleSelection } from '../DashboardModuleSelectionContext';
import { setDashboardModuleDragData } from '../dashboard-drag';
import { isModuleSuEligible } from '../dashboard-grades';
import type { DashboardModule } from '../types';

function getEstimatedWorkload(workload: unknown) {
  if (!Array.isArray(workload)) {
    return 0;
  }

  return workload.reduce((total, workloadPart) => {
    const numericWorkloadPart = typeof workloadPart === 'number'
      ? workloadPart
      : Number(workloadPart);

    return Number.isFinite(numericWorkloadPart) ? total + numericWorkloadPart : total;
  }, 0);
}

function toDashboardModule(module: NusModuleListItem): DashboardModule {
  return {
    code: module.moduleCode,
    title: module.title,
    faculty: module.faculty,
    credits: Number(module.moduleCredit) || 0,
    estimatedWorkload: getEstimatedWorkload(module.workload),
    isSuEligible: isModuleSuEligible(module.attributes),
    prerequisite: module.prerequisite,
    semesterData: module.semesterData,
  };
}

export function DashboardModuleSearchBar() {
  const { addSelectedModule, isModuleInPlan } = useDashboardModuleSelection();

  function handleModuleDragStart(event: DragEvent<HTMLButtonElement>, module: NusModuleListItem) {
    setDashboardModuleDragData(event, toDashboardModule(module));
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-gray-900">Find Modules</h2>
      <NusModuleSearchBar
        containerClassName="relative w-full"
        dropdownClassName="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white py-2 text-gray-900 shadow-xl"
        getModuleResultClassName={(module) => (
          isModuleInPlan(module.moduleCode) ? 'bg-green-100 hover:bg-green-100' : 'hover:bg-orange-50'
        )}
        iconClassName="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
        inputClassName="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
        onModuleClick={(module) => addSelectedModule(toDashboardModule(module))}
        onModuleDragStart={handleModuleDragStart}
        placeholder="Search modules"
      />
    </section>
  );
}
