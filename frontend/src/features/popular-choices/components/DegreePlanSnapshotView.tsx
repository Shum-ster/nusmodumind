type DegreePlanSnapshotViewProps = {
  snapshot: unknown;
};

type SnapshotModule = {
  code: string;
  credits: number | null;
  title: string;
};

type SnapshotSemester = {
  label: string;
  modules: SnapshotModule[];
};

type SnapshotYear = {
  academicYear: string | null;
  label: string;
  semesters: SnapshotSemester[];
};

type NormalizedSnapshot = {
  exemptedModules: SnapshotModule[];
  generatedAt: string | null;
  matriculationYear: number | null;
  selectedModules: SnapshotModule[];
  years: SnapshotYear[];
};

export function DegreePlanSnapshotView({
  snapshot,
}: DegreePlanSnapshotViewProps) {
  const plan = normalizePlanSnapshot(snapshot);

  if (!plan) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm font-medium text-gray-500">
        No rendered degree plan is available for this submission.
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-200 pb-3 text-sm font-semibold text-gray-600">
        {plan.matriculationYear ? (
          <span>Matriculation year {plan.matriculationYear}</span>
        ) : null}
        {plan.generatedAt ? <span>Generated {formatDate(plan.generatedAt)}</span> : null}
      </div>

      {plan.years.map((year, yearIndex) => (
        <section key={`${year.label}-${yearIndex}`} className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-bold text-gray-950">{year.label}</h3>
            {year.academicYear ? (
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                AY {year.academicYear}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {year.semesters.map((semester, semesterIndex) => (
              <ModuleGroup
                key={`${semester.label}-${semesterIndex}`}
                label={semester.label}
                modules={semester.modules}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleGroup
          label="Selected modules"
          modules={plan.selectedModules}
          emptyLabel="No unplaced selected modules."
        />
        <ModuleGroup
          label="Exempted modules"
          modules={plan.exemptedModules}
          emptyLabel="No exempted modules."
        />
      </div>
    </div>
  );
}

function ModuleGroup({
  emptyLabel = 'No modules added.',
  label,
  modules,
}: {
  emptyLabel?: string;
  label: string;
  modules: SnapshotModule[];
}) {
  return (
    <div className="min-w-0">
      <h4 className="mb-2 text-sm font-bold text-gray-700">{label}</h4>
      <div className="overflow-hidden rounded-md border border-gray-200">
        {modules.length > 0 ? (
          modules.map((module) => (
            <div
              key={`${module.code}-${module.title}`}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)_4rem] items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0"
            >
              <span className="truncate text-sm font-bold text-orange-700">
                {module.code}
              </span>
              <span className="min-w-0 truncate text-sm font-medium text-gray-800">
                {module.title}
              </span>
              <span className="text-right text-xs font-bold text-gray-500">
                {formatCredits(module.credits)}
              </span>
            </div>
          ))
        ) : (
          <p className="px-3 py-3 text-sm font-medium text-gray-500">
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export function normalizePlanSnapshot(
  snapshot: unknown,
): NormalizedSnapshot | null {
  if (!isRecord(snapshot)) {
    return null;
  }

  return normalizeCurrentSnapshot(snapshot) ?? normalizeLegacySnapshot(snapshot);
}

function normalizeCurrentSnapshot(
  snapshot: Record<string, unknown>,
): NormalizedSnapshot | null {
  if (!Array.isArray(snapshot.years)) {
    return null;
  }

  const years = snapshot.years
    .map((year, yearIndex) => normalizeCurrentYear(year, yearIndex))
    .filter((year): year is SnapshotYear => year !== null);

  return {
    exemptedModules: normalizeModuleList(snapshot.exemptedModules),
    generatedAt: toOptionalString(snapshot.generatedAt),
    matriculationYear: toOptionalNumber(snapshot.matriculationYear),
    selectedModules: normalizeModuleList(snapshot.selectedModules),
    years,
  };
}

function normalizeCurrentYear(year: unknown, yearIndex: number) {
  if (!isRecord(year) || !Array.isArray(year.semesters)) {
    return null;
  }

  return {
    academicYear: toOptionalString(year.academicYear),
    label: toOptionalString(year.label) ?? `Year ${yearIndex + 1}`,
    semesters: year.semesters.map((semester, semesterIndex) =>
      normalizeCurrentSemester(semester, semesterIndex),
    ),
  };
}

function normalizeCurrentSemester(semester: unknown, semesterIndex: number) {
  if (!isRecord(semester)) {
    return {
      label: `Semester ${semesterIndex + 1}`,
      modules: [],
    };
  }

  return {
    label: toOptionalString(semester.label) ?? `Semester ${semesterIndex + 1}`,
    modules: normalizeModuleList(semester.modules),
  };
}

function normalizeLegacySnapshot(
  snapshot: Record<string, unknown>,
): NormalizedSnapshot | null {
  const semesters = Array.isArray(snapshot.semesters)
    ? snapshot.semesters
        .map(normalizeLegacySemester)
        .filter((semester): semester is SnapshotSemester => semester !== null)
    : [];

  const plannedModules = normalizeModuleList(snapshot.plannedModules);
  const selectedModules = normalizeModuleList(snapshot.selectedModules);
  const exemptedModules = normalizeModuleList(snapshot.exemptedModules);

  if (
    semesters.length === 0 &&
    plannedModules.length === 0 &&
    selectedModules.length === 0 &&
    exemptedModules.length === 0
  ) {
    return null;
  }

  return {
    exemptedModules,
    generatedAt: toOptionalString(snapshot.generatedAt),
    matriculationYear: toOptionalNumber(snapshot.matriculationYear),
    selectedModules:
      selectedModules.length > 0 || semesters.length > 0
        ? selectedModules
        : plannedModules,
    years:
      semesters.length > 0
        ? [
            {
              academicYear: null,
              label: 'Saved semesters',
              semesters,
            },
          ]
        : [],
  };
}

function normalizeLegacySemester(semester: unknown) {
  if (!isRecord(semester)) {
    return null;
  }

  const acadYear =
    toOptionalString(semester.acadYear) ?? toOptionalString(semester.acad_year);
  const semesterNumber =
    toOptionalNumber(semester.semesterNumber) ??
    toOptionalNumber(semester.semester_number);
  const label =
    toOptionalString(semester.label) ??
    ([
      acadYear ? `AY${acadYear}` : null,
      semesterNumber ? `Semester ${semesterNumber}` : null,
    ]
      .filter(Boolean)
      .join(' ') ||
      'Saved semester');
  const modules = normalizeModuleList(
    Array.isArray(semester.modules)
      ? semester.modules
      : semester.plannedModules,
  );

  return {
    label,
    modules,
  };
}

function normalizeModuleList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeModule)
    .filter((module): module is SnapshotModule => module !== null);
}

function normalizeModule(value: unknown): SnapshotModule | null {
  if (!isRecord(value)) {
    return null;
  }

  const nestedModule = isRecord(value.module) ? value.module : {};
  const code =
    toOptionalString(value.code) ??
    toOptionalString(value.moduleCode) ??
    toOptionalString(value.module_code) ??
    toOptionalString(nestedModule.moduleCode) ??
    toOptionalString(nestedModule.module_code);

  if (!code) {
    return null;
  }

  return {
    code,
    credits: parseCredits(
      value.credits ?? value.moduleCredit ?? nestedModule.moduleCredit,
    ),
    title:
      toOptionalString(value.title) ??
      toOptionalString(nestedModule.title) ??
      code,
  };
}

function parseCredits(value: unknown) {
  const parsedValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatCredits(credits: number | null) {
  return credits === null ? '-' : `${credits} MC`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toOptionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number.parseInt(value, 10);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
