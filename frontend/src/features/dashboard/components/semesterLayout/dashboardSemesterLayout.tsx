import type { MockNusModule } from '../../mockModules';
import type { SemesterKey } from '../../DashboardModuleSelectionContext';
import { useDashboardModuleSelection } from '../../DashboardModuleSelectionContext';
import { ModuleNameLayout } from '../moduleNameLayout';

type DashboardSemesterLayoutProps = {
  semesterName: string;
  semesterKey: SemesterKey;
  modules: MockNusModule[];
};

export function DashboardSemesterLayout({ semesterName, semesterKey, modules }: DashboardSemesterLayoutProps) {
  const { moveModuleToSemester } = useDashboardModuleSelection();
  const totalUnits = modules.reduce((total, module) => total + module.credits, 0);
  const averageWorkload = modules.length
    ? modules.reduce((total, module) => total + module.estimatedWorkload, 0) / modules.length
    : 0;

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        moveModuleToSemester(semesterKey, event.dataTransfer.getData('text/plain'));
      }}
      className="flex min-h-[190px] w-full flex-col rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-900 shadow-sm"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-900">{semesterName}</h2>

        <div className="grid gap-1 text-right text-xs text-gray-600">
          <p>
            <span className="font-semibold text-gray-900">{averageWorkload.toFixed(1)}/5</span> avg workload
          </p>
          <p>
            <span className="font-semibold text-gray-900">{totalUnits}</span> total units
          </p>
        </div>
      </div>

      <div className="grid gap-2 overflow-y-auto pr-1">
        {modules.length > 0 ? (
          modules.map((module) => (
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
          <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 text-center text-sm font-medium text-gray-500">
            No modules added yet.
          </div>
        )}
      </div>
    </section>
  );
}
