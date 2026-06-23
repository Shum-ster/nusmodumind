'use client';

import { X } from 'lucide-react';
import { useDashboardModuleSelection } from '../DashboardModuleSelectionContext';
import { getDashboardModuleDropData, setDashboardModuleDragData } from '../dashboard-drag';
import { DashboardModuleCard } from './DashboardModuleCard';

export function SelectedModules() {
  const { moveModuleToSelected, removeSelectedModule, selectedModules } = useDashboardModuleSelection();

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
          moveModuleToSelected(dropData.moduleCode, dropData.module);
        }
      }}
      className="flex max-h-[calc(100vh-6rem)] min-h-[520px] flex-col rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-sm"
    >
      <div className="mb-3">
        <h2 className="text-lg font-bold text-gray-900">Selected Modules</h2>
        <p className="mt-1 text-sm text-gray-500">Drag modules into a semester or exemptions.</p>
      </div>

      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
        {selectedModules.length > 0 ? (
          selectedModules.map((module) => (
            <div key={module.code} className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2">
              <div
                draggable
                onDragStart={(event) => {
                  setDashboardModuleDragData(event, module);
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <DashboardModuleCard
                  module={module}
                  showTitle={false}
                />
              </div>
              <button
                type="button"
                title={`Remove ${module.code}`}
                aria-label={`Remove ${module.code}`}
                onClick={() => removeSelectedModule(module.code)}
                onPointerDown={(event) => event.stopPropagation()}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="flex min-h-full items-center justify-center rounded-md border border-dashed border-gray-300 px-4 text-center text-sm font-medium text-gray-500">
            Search and select modules from the top bar.
          </div>
        )}
      </div>
    </aside>
  );
}
