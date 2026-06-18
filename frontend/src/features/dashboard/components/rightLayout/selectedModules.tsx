'use client';

import { useDashboardModuleSelection } from '../../DashboardModuleSelectionContext';
import { ModuleNameLayout } from '../moduleNameLayout';

export function SelectedModules() {
  const { moveModuleToSelected, selectedModules } = useDashboardModuleSelection();

  return (
    <aside
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        moveModuleToSelected(event.dataTransfer.getData('text/plain'));
      }}
      className="flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-sm"
    >
      <div className="mb-3">
        <h2 className="text-lg font-bold text-gray-900">Selected Modules</h2>
        <p className="mt-1 text-sm text-gray-500">Drag modules into a semester or exemptions.</p>
      </div>

      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
        {selectedModules.length > 0 ? (
          selectedModules.map((module) => (
            <div
              key={module.code}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', module.code);
                event.dataTransfer.effectAllowed = 'move';
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              <ModuleNameLayout module={module} />
            </div>
          ))
        ) : (
          <div className="flex min-h-full items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 text-center text-sm font-medium text-gray-500">
            Search and select modules from the top bar.
          </div>
        )}
      </div>
    </aside>
  );
}
