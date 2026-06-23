import type { SemesterKey } from '../../DashboardModuleSelectionContext';
import type { DashboardModule } from '../../types';
import { useDashboardModuleSelection } from '../../DashboardModuleSelectionContext';
import { getDashboardModuleDropData, setDashboardModuleDragData } from '../../dashboard-drag';
import { buildUnsatisfiedModuleIssues } from '../../dashboard-validation';
import { DashboardModuleCard } from '../DashboardModuleCard';
import { UnsatisfiedModule } from '../UnsatisfiedModule';

type DashboardSemesterLayoutProps = {
  semesterName: string;
  semesterKey: SemesterKey;
  modules: DashboardModule[];
};

export function DashboardSemesterLayout({ semesterName, semesterKey, modules }: DashboardSemesterLayoutProps) {
  const { exemptedModules, moveModuleToSemester, semesterModules } = useDashboardModuleSelection();
  const totalUnits = modules.reduce((total, module) => total + module.credits, 0);
  const totalWorkload = modules.reduce((total, module) => total + module.estimatedWorkload, 0);
  const unsatisfiedModuleIssues = buildUnsatisfiedModuleIssues({
    exemptedModules,
    modules,
    semesterKey,
    semesterModules,
  });
  const unsatisfiedModuleIssueByCode = new Map(
    unsatisfiedModuleIssues.map((issue) => [issue.moduleCode, issue]),
  );
  const unitStatusClass = totalUnits > 32
    ? 'border-red-300 bg-red-50'
    : totalUnits >= 18
      ? 'border-green-300 bg-green-50'
      : 'border-gray-200 bg-gray-50';

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        const dropData = getDashboardModuleDropData(event);

        if (dropData) {
          moveModuleToSemester(semesterKey, dropData.moduleCode, dropData.module);
        }
      }}
      className={`flex min-h-[140px] w-full flex-col rounded-md border p-4 text-gray-900 transition-colors ${unitStatusClass}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-900">{semesterName}</h2>

        <div className="grid gap-1 text-right text-xs text-gray-600">
          <p>
            <span className="font-semibold text-gray-900">{totalWorkload.toFixed(1)}</span> hrs/wk
          </p>
          <p>
            <span className="font-semibold text-gray-900">{totalUnits}</span> units
          </p>
        </div>
      </div>

      <div className="grid content-start gap-2 overflow-y-auto pr-1">
        {modules.length > 0 ? (
          modules.map((module) => (
            <div
              key={module.code}
              draggable
              onDragStart={(event) => {
                setDashboardModuleDragData(event, module);
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              <DashboardModuleCard module={module} />
              {unsatisfiedModuleIssueByCode.has(module.code) && (
                <div className="mt-2">
                  <UnsatisfiedModule issue={unsatisfiedModuleIssueByCode.get(module.code)!} />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex min-h-16 items-center justify-center rounded-md border border-dashed border-gray-300 px-4 text-center text-sm font-medium text-gray-500">
            No modules added yet.
          </div>
        )}
      </div>
    </section>
  );
}
