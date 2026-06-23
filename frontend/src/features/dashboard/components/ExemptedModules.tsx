'use client';

import { useDashboardModuleSelection } from '../DashboardModuleSelectionContext';
import { getDashboardModuleDropData, setDashboardModuleDragData } from '../dashboard-drag';
import { DashboardModuleCard } from './DashboardModuleCard';

export function ExemptedModules() {
  const { exemptedModules, moveModuleToExempted } = useDashboardModuleSelection();

  return (
    <aside
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        const dropData = getDashboardModuleDropData(event);

        if (dropData) {
          moveModuleToExempted(dropData.moduleCode, dropData.module);
        }
      }}
      className="flex min-h-[220px] flex-col rounded-lg border border-gray-300 bg-gray-100 p-4 text-gray-900 shadow-sm"
    >
      <div className="mb-3">
        <h2 className="text-lg font-bold text-gray-900">Exempted Modules</h2>
        <p className="mt-1 text-sm text-gray-500">Drag modules here to mark them exempted.</p>
      </div>

      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
        {exemptedModules.length > 0 ? (
          exemptedModules.map((module) => (
            <div
              key={module.code}
              draggable
              onDragStart={(event) => {
                setDashboardModuleDragData(event, module);
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              <DashboardModuleCard module={module} />
            </div>
          ))
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-gray-400 px-4 text-center text-sm font-medium text-gray-500">
            Drop modules here.
          </div>
        )}
      </div>
    </aside>
  );
}
