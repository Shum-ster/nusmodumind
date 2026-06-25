import type { TimetableModule } from '../timetable-api';

type CurrentModuleLayoutProps = {
  modules: TimetableModule[];
};

export function CurrentModuleLayout({ modules }: CurrentModuleLayoutProps) {
  const totalSelectedLessons = modules.reduce(
    (total, module) => total + module.selectedLessons.length,
    0,
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-950">Current Modules</h2>
          <p className="mt-1 text-sm font-medium text-gray-500">Modules with timetable data for this semester.</p>
        </div>

        <div className="text-right text-sm font-medium text-gray-500">
          <p>
            <span className="font-semibold text-gray-900">{modules.length}</span> modules
          </p>
          <p>
            <span className="font-semibold text-gray-900">{totalSelectedLessons}</span> selected lessons
          </p>
        </div>
      </div>

      {modules.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.plannedModuleId}
              className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
            >
              <p className="font-bold text-orange-600">{module.moduleCode}</p>
              <p className="mt-1 font-medium text-gray-800">
                {module.selectedLessons.length} selected lesson{module.selectedLessons.length === 1 ? '' : 's'}
              </p>
              <p className="mt-2 text-xs font-medium text-gray-500">
                {module.availableLessons.length} available lesson{module.availableLessons.length === 1 ? '' : 's'}
                {module.examDate ? ` - Exam ${module.examDate}` : ''}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 text-center text-sm font-medium text-gray-500">
          No modules have been placed in this semester on the dashboard yet.
        </div>
      )}
    </section>
  );
}
