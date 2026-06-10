import type { MockNusModule } from '../mockModules';
import { ModuleNameLayout } from './moduleNameLayout';

type DashboardSemesterLayoutProps = {
  semesterName: string;
  modules: MockNusModule[];
};

export function DashboardSemesterLayout({ semesterName, modules }: DashboardSemesterLayoutProps) {
  const totalUnits = modules.reduce((total, module) => total + module.credits, 0);
  const averageWorkload = modules.length
    ? modules.reduce((total, module) => total + module.estimatedWorkload, 0) / modules.length
    : 0;

  return (
    <section className="flex aspect-square max-h-[640px] min-h-[420px] w-full max-w-[640px] flex-col rounded-lg border border-gray-200 bg-gray-50 p-5 text-gray-900 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">{semesterName}</h2>

        <div className="grid gap-1 text-right text-sm text-gray-600">
          <p>
            <span className="font-semibold text-gray-900">{averageWorkload.toFixed(1)}/5</span> avg workload
          </p>
          <p>
            <span className="font-semibold text-gray-900">{totalUnits}</span> total units
          </p>
        </div>
      </div>

      <div className="grid gap-2 overflow-y-auto pr-1">
        {modules.map((module) => (
          <ModuleNameLayout key={module.code} module={module} />
        ))}
      </div>
    </section>
  );
}
