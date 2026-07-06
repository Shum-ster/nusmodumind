'use client';

type CourseWorkloadDiagramProps = {
  workload: unknown;
};

type WorkloadPart = {
  barClassName: string;
  hours: number;
  label: string;
  textClassName: string;
};

const workloadPartConfig = [
  { barClassName: 'bg-sky-800', label: 'Lec', textClassName: 'text-sky-600' },
  { barClassName: 'bg-lime-900', label: 'Tut', textClassName: 'text-lime-600' },
  { barClassName: 'bg-stone-800', label: 'Lab', textClassName: 'text-stone-500' },
  { barClassName: 'bg-amber-800', label: 'Project', textClassName: 'text-amber-500' },
  { barClassName: 'bg-red-800', label: 'Preparation', textClassName: 'text-red-500' },
] as const;

function getWorkloadParts(workload: unknown): WorkloadPart[] {
  if (!Array.isArray(workload)) {
    return [];
  }

  return workloadPartConfig.map((config, index) => {
    const numericHours = Number(workload[index]);

    return {
      ...config,
      hours: Number.isFinite(numericHours) ? numericHours : 0,
    };
  });
}

function formatHours(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

export function CourseWorkloadDiagram({ workload }: CourseWorkloadDiagramProps) {
  const workloadParts = getWorkloadParts(workload);
  const totalHours = workloadParts.reduce((total, part) => total + part.hours, 0);
  const visibleWorkloadParts = workloadParts.filter((part) => part.hours > 0);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-950">
        Workload{totalHours > 0 ? ` - ${formatHours(totalHours)} hrs` : ''}
      </h2>

      {totalHours > 0 ? (
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="mb-2 flex min-w-[36rem]">
            {visibleWorkloadParts.map((part) => (
              <div
                key={part.label}
                style={{ flexGrow: part.hours }}
                className={`min-w-20 text-sm font-bold ${part.textClassName}`}
              >
                {part.label}
              </div>
            ))}
          </div>
          <div className="flex h-10 min-w-[36rem] overflow-hidden rounded-sm border border-gray-200 bg-gray-100">
            {visibleWorkloadParts.map((part) => (
              <div
                key={part.label}
                title={`${part.label}: ${formatHours(part.hours)} hrs/wk`}
                style={{ flexGrow: part.hours }}
                className={`min-w-20 border-r border-white/30 last:border-r-0 ${part.barClassName}`}
              />
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {workloadParts.map((part) => (
              <div key={part.label} className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <span className={`h-3 w-3 rounded-sm ${part.barClassName}`} />
                <span className={part.textClassName}>{part.label}</span>
                <span>{formatHours(part.hours)} hrs</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm font-medium text-gray-500">
          Workload information is not available for this module.
        </p>
      )}
    </section>
  );
}
