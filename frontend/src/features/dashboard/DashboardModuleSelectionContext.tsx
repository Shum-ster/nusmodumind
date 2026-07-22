'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { getToken } from '@/features/auth/lib/token-storage';
import {
  createPlannedModule,
  createSemester,
  deletePlannedModule,
  getCurrentUserPlan,
  updatePlannedModule,
  type PlannedModuleRecord,
  type PlannedModuleStatus,
  type SemesterRecord,
} from '@/features/planner';
import { useUserProfile } from '@/features/user';
import {
  isModuleSuEligible,
  normalizeDashboardGrade,
  type DashboardGrade,
} from './dashboard-grades';
import type {
  DashboardModule,
  SemesterKey,
  SemesterNumber,
  YearNumber,
} from '@/shared/types';

type DashboardModuleSelectionContextValue = {
  completedSemesterKeys: Record<SemesterKey, boolean>;
  exemptedModules: DashboardModule[];
  matriculationYear: number;
  semesterModules: Record<SemesterKey, DashboardModule[]>;
  selectedModules: DashboardModule[];
  addSelectedModule: (module: DashboardModule) => void;
  isModuleInPlan: (moduleCode: string) => boolean;
  isModuleSelected: (moduleCode: string) => boolean;
  moveModuleToExempted: (
    moduleCode: string,
    fallbackModule?: DashboardModule,
  ) => void;
  moveModuleToSelected: (
    moduleCode: string,
    fallbackModule?: DashboardModule,
  ) => void;
  moveModuleToSemester: (
    semesterKey: SemesterKey,
    moduleCode: string,
    fallbackModule?: DashboardModule,
  ) => void;
  removeSelectedModule: (moduleCode: string) => void;
  toggleSemesterCompletion: (semesterKey: SemesterKey) => void;
  updateModuleActualGrade: (
    moduleCode: string,
    actualGrade: DashboardGrade | null,
  ) => void;
};

const DashboardModuleSelectionContext =
  createContext<DashboardModuleSelectionContextValue | null>(null);

type DashboardModuleSelectionProviderProps = {
  children: ReactNode;
};

type PlannedModuleIdsByCode = Record<string, string>;
type SemesterRecordsByKey = Partial<Record<SemesterKey, SemesterRecord>>;

const initialSemesterModules: Record<SemesterKey, DashboardModule[]> = {
  'year-1-semester-1': [],
  'year-1-semester-2': [],
  'year-2-semester-1': [],
  'year-2-semester-2': [],
  'year-3-semester-1': [],
  'year-3-semester-2': [],
  'year-4-semester-1': [],
  'year-4-semester-2': [],
};

const defaultMatriculationYear = 2026;
const planDurationYears = 4;

function cloneInitialSemesterModules() {
  return Object.fromEntries(
    Object.entries(initialSemesterModules).map(([semesterKey, modules]) => [
      semesterKey,
      [...modules],
    ]),
  ) as Record<SemesterKey, DashboardModule[]>;
}

function cloneInitialCompletedSemesterKeys() {
  return Object.fromEntries(
    Object.keys(initialSemesterModules).map((semesterKey) => [
      semesterKey,
      false,
    ]),
  ) as Record<SemesterKey, boolean>;
}

function getEstimatedWorkload(workload: unknown) {
  if (!Array.isArray(workload)) {
    return 0;
  }

  return workload.reduce((total, workloadPart) => {
    const numericWorkloadPart =
      typeof workloadPart === 'number' ? workloadPart : Number(workloadPart);

    return Number.isFinite(numericWorkloadPart)
      ? total + numericWorkloadPart
      : total;
  }, 0);
}

function toDashboardModule(
  plannedModule: PlannedModuleRecord,
): DashboardModule {
  return {
    code: plannedModule.module.moduleCode,
    title: plannedModule.module.title,
    faculty: plannedModule.module.faculty,
    credits: Number(plannedModule.module.moduleCredit) || 0,
    estimatedWorkload: getEstimatedWorkload(plannedModule.module.workload),
    actualGrade: normalizeDashboardGrade(plannedModule.actualGrade),
    isSuEligible: isModuleSuEligible(plannedModule.module.attributes),
    prerequisite: plannedModule.module.prerequisite,
    semesterData: plannedModule.module.semesterData,
  };
}

function parseSemesterKey(semesterKey: SemesterKey) {
  const [, year, , semester] = semesterKey.split('-');

  return {
    semesterNumber: Number(semester) as SemesterNumber,
    yearNumber: Number(year) as YearNumber,
  };
}

function getMatriculationYearFromGraduationYear(
  graduationYear?: number | null,
) {
  return graduationYear
    ? graduationYear - planDurationYears
    : defaultMatriculationYear;
}

function getAcadYearForSemesterKey(
  semesterKey: SemesterKey,
  matriculationYear: number,
) {
  const { yearNumber } = parseSemesterKey(semesterKey);
  const academicYearStart = matriculationYear + yearNumber - 1;

  return `${academicYearStart}/${academicYearStart + 1}`;
}

function getAcademicYearStart(acadYear: string) {
  const yearMatch = acadYear.match(/\d{4}/);

  return yearMatch ? Number(yearMatch[0]) : null;
}

function getSemesterKeyFromRecord(
  semester: SemesterRecord,
  matriculationYear: number,
): SemesterKey | null {
  const academicYearStart = getAcademicYearStart(semester.acadYear);

  if (
    academicYearStart === null ||
    (semester.semesterNumber !== 1 && semester.semesterNumber !== 2)
  ) {
    return null;
  }

  const yearNumber = academicYearStart - matriculationYear + 1;

  if (yearNumber < 1 || yearNumber > 4) {
    return null;
  }

  return `year-${yearNumber as YearNumber}-semester-${semester.semesterNumber as SemesterNumber}`;
}

function removeModuleFromSemesterState(
  semesterModules: Record<SemesterKey, DashboardModule[]>,
  moduleCode: string,
) {
  const nextSemesters = { ...semesterModules };

  Object.keys(nextSemesters).forEach((currentSemesterKey) => {
    const typedSemesterKey = currentSemesterKey as SemesterKey;
    nextSemesters[typedSemesterKey] = nextSemesters[typedSemesterKey].filter(
      (semesterModule) => semesterModule.code !== moduleCode,
    );
  });

  return nextSemesters;
}

export function DashboardModuleSelectionProvider({
  children,
}: DashboardModuleSelectionProviderProps) {
  const { profile } = useUserProfile();
  const matriculationYear =
    profile?.matriculationYear ??
    getMatriculationYearFromGraduationYear(profile?.graduationYear);
  const [completedSemesterKeys, setCompletedSemesterKeys] = useState(
    cloneInitialCompletedSemesterKeys,
  );
  const [exemptedModules, setExemptedModules] = useState<DashboardModule[]>([]);
  const [selectedModules, setSelectedModules] = useState<DashboardModule[]>([]);
  const [semesterModules, setSemesterModules] = useState(
    cloneInitialSemesterModules,
  );
  const [plannedModuleIdsByCode, setPlannedModuleIdsByCode] =
    useState<PlannedModuleIdsByCode>({});
  const [, setSemesterRecordsByKey] = useState<SemesterRecordsByKey>({});
  const plannedModuleIdsByCodeRef = useRef<PlannedModuleIdsByCode>({});
  const pendingPlannedModuleCreatesRef = useRef<
    Record<string, Promise<PlannedModuleRecord>>
  >({});
  const pendingSemesterCreatesRef = useRef<
    Partial<Record<SemesterKey, Promise<SemesterRecord>>>
  >({});
  const semesterRecordsByKeyRef = useRef<SemesterRecordsByKey>({});
  const matriculationYearRef = useRef(matriculationYear);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    plannedModuleIdsByCodeRef.current = plannedModuleIdsByCode;
  }, [plannedModuleIdsByCode]);

  useEffect(() => {
    matriculationYearRef.current = matriculationYear;
  }, [matriculationYear]);

  useEffect(() => {
    const token = getToken();
    let isCurrentRequest = true;

    tokenRef.current = token;

    if (!token) {
      return () => {
        isCurrentRequest = false;
      };
    }

    getCurrentUserPlan(token)
      .then((plan) => {
        if (!isCurrentRequest) {
          return;
        }

        const nextExemptedModules: DashboardModule[] = [];
        const nextSelectedModules: DashboardModule[] = [];
        const nextCompletedSemesterKeys = cloneInitialCompletedSemesterKeys();
        const nextSemesterModules = cloneInitialSemesterModules();
        const nextPlannedModuleIdsByCode: PlannedModuleIdsByCode = {};
        const nextSemesterRecordsByKey: SemesterRecordsByKey = {};

        plan.semesters.forEach((semester) => {
          const semesterKey = getSemesterKeyFromRecord(
            semester,
            matriculationYear,
          );

          if (semesterKey) {
            nextSemesterRecordsByKey[semesterKey] = semester;
          }
        });

        plan.plannedModules.forEach((plannedModule) => {
          const dashboardModule = toDashboardModule(plannedModule);

          nextPlannedModuleIdsByCode[dashboardModule.code] = plannedModule.id;

          if (plannedModule.status === 'EXEMPTED') {
            nextExemptedModules.push(dashboardModule);
            return;
          }

          if (plannedModule.status === 'PLANNED' && plannedModule.semester) {
            const semesterKey = getSemesterKeyFromRecord(
              plannedModule.semester,
              matriculationYear,
            );

            if (semesterKey) {
              nextSemesterModules[semesterKey] = [
                ...nextSemesterModules[semesterKey],
                dashboardModule,
              ];
              nextCompletedSemesterKeys[semesterKey] =
                nextCompletedSemesterKeys[semesterKey] ||
                dashboardModule.actualGrade !== null;
              nextSemesterRecordsByKey[semesterKey] = plannedModule.semester;
              return;
            }
          }

          nextSelectedModules.push(dashboardModule);
        });

        plannedModuleIdsByCodeRef.current = nextPlannedModuleIdsByCode;
        semesterRecordsByKeyRef.current = nextSemesterRecordsByKey;
        setCompletedSemesterKeys(nextCompletedSemesterKeys);
        setExemptedModules(nextExemptedModules);
        setSelectedModules(nextSelectedModules);
        setSemesterModules(nextSemesterModules);
        setPlannedModuleIdsByCode(nextPlannedModuleIdsByCode);
        setSemesterRecordsByKey(nextSemesterRecordsByKey);
      })
      .catch(() => {
        // Keep the optimistic local dashboard usable if hydration fails.
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [matriculationYear]);

  const registerPlannedModule = useCallback(
    (moduleCode: string, plannedModuleId: string) => {
      plannedModuleIdsByCodeRef.current = {
        ...plannedModuleIdsByCodeRef.current,
        [moduleCode]: plannedModuleId,
      };
      setPlannedModuleIdsByCode(plannedModuleIdsByCodeRef.current);
    },
    [],
  );

  const unregisterPlannedModule = useCallback((moduleCode: string) => {
    const nextPlannedModuleIdsByCode = { ...plannedModuleIdsByCodeRef.current };

    delete nextPlannedModuleIdsByCode[moduleCode];
    plannedModuleIdsByCodeRef.current = nextPlannedModuleIdsByCode;
    setPlannedModuleIdsByCode(nextPlannedModuleIdsByCode);
  }, []);

  const persistModulePlacement = useCallback(
    async (
      module: DashboardModule,
      status: PlannedModuleStatus,
      semesterId?: string | null,
    ) => {
      const token = tokenRef.current;

      if (!token) {
        return;
      }

      const existingPlannedModuleId =
        plannedModuleIdsByCodeRef.current[module.code];
      const pendingCreate = pendingPlannedModuleCreatesRef.current[module.code];

      if (existingPlannedModuleId) {
        await updatePlannedModule(token, existingPlannedModuleId, {
          moduleCode: module.code,
          semesterId: semesterId ?? null,
          status,
        });
        return;
      }

      if (pendingCreate) {
        const plannedModule = await pendingCreate;

        registerPlannedModule(module.code, plannedModule.id);
        await updatePlannedModule(token, plannedModule.id, {
          moduleCode: module.code,
          semesterId: semesterId ?? null,
          status,
        });
        return;
      }

      const createPromise = createPlannedModule(token, {
        moduleCode: module.code,
        semesterId: semesterId ?? null,
        status,
      });

      pendingPlannedModuleCreatesRef.current[module.code] = createPromise;

      try {
        const plannedModule = await createPromise;
        registerPlannedModule(module.code, plannedModule.id);
      } finally {
        delete pendingPlannedModuleCreatesRef.current[module.code];
      }
    },
    [registerPlannedModule],
  );

  const persistModuleActualGrade = useCallback(
    async (moduleCode: string, actualGrade: DashboardGrade | null) => {
      const token = tokenRef.current;

      if (!token) {
        return;
      }

      const existingPlannedModuleId =
        plannedModuleIdsByCodeRef.current[moduleCode];
      const pendingCreate = pendingPlannedModuleCreatesRef.current[moduleCode];

      if (existingPlannedModuleId) {
        await updatePlannedModule(token, existingPlannedModuleId, {
          actualGrade,
        });
        return;
      }

      if (pendingCreate) {
        const plannedModule = await pendingCreate;

        registerPlannedModule(moduleCode, plannedModule.id);
        await updatePlannedModule(token, plannedModule.id, { actualGrade });
      }
    },
    [registerPlannedModule],
  );

  const ensureSemester = useCallback(async (semesterKey: SemesterKey) => {
    const token = tokenRef.current;
    const existingSemester = semesterRecordsByKeyRef.current[semesterKey];

    if (!token) {
      return null;
    }

    if (existingSemester) {
      return existingSemester;
    }

    const pendingSemester = pendingSemesterCreatesRef.current[semesterKey];

    if (pendingSemester) {
      return pendingSemester;
    }

    const { semesterNumber } = parseSemesterKey(semesterKey);
    const createPromise = createSemester(token, {
      acadYear: getAcadYearForSemesterKey(
        semesterKey,
        matriculationYearRef.current,
      ),
      semesterNumber,
    });

    pendingSemesterCreatesRef.current[semesterKey] = createPromise;

    try {
      const semester = await createPromise;

      semesterRecordsByKeyRef.current = {
        ...semesterRecordsByKeyRef.current,
        [semesterKey]: semester,
      };
      setSemesterRecordsByKey(semesterRecordsByKeyRef.current);

      return semester;
    } finally {
      delete pendingSemesterCreatesRef.current[semesterKey];
    }
  }, []);

  const addSelectedModule = useCallback(
    (selectedModule: DashboardModule) => {
      const isAlreadyPlanned =
        exemptedModules.some(
          (currentModule) => currentModule.code === selectedModule.code,
        ) ||
        Object.values(semesterModules)
          .flat()
          .some((currentModule) => currentModule.code === selectedModule.code);

      if (isAlreadyPlanned) {
        return;
      }

      setSelectedModules((currentModules) => {
        if (
          currentModules.some(
            (currentModule) => currentModule.code === selectedModule.code,
          )
        ) {
          return currentModules;
        }

        return [...currentModules, selectedModule];
      });

      void persistModulePlacement(selectedModule, 'SELECTED', null).catch(
        () => undefined,
      );
    },
    [exemptedModules, persistModulePlacement, semesterModules],
  );

  const isModuleSelected = useCallback(
    (moduleCode: string) =>
      selectedModules.some(
        (selectedModule) => selectedModule.code === moduleCode,
      ),
    [selectedModules],
  );

  const findModuleByCode = useCallback(
    (moduleCode: string) =>
      selectedModules.find(
        (currentModule) => currentModule.code === moduleCode,
      ) ??
      exemptedModules.find(
        (currentModule) => currentModule.code === moduleCode,
      ) ??
      Object.values(semesterModules)
        .flat()
        .find((currentModule) => currentModule.code === moduleCode),
    [exemptedModules, selectedModules, semesterModules],
  );

  const isModuleInPlan = useCallback(
    (moduleCode: string) => Boolean(findModuleByCode(moduleCode)),
    [findModuleByCode],
  );

  const removeModuleFromSemesters = useCallback((moduleCode: string) => {
    setSemesterModules((currentSemesters) =>
      removeModuleFromSemesterState(currentSemesters, moduleCode),
    );
  }, []);

  const removeModuleFromBuckets = useCallback(
    (moduleCode: string) => {
      removeModuleFromSemesters(moduleCode);
      setExemptedModules((currentModules) =>
        currentModules.filter(
          (currentModule) => currentModule.code !== moduleCode,
        ),
      );
      setSelectedModules((currentModules) =>
        currentModules.filter(
          (currentModule) => currentModule.code !== moduleCode,
        ),
      );
    },
    [removeModuleFromSemesters],
  );

  const removeSelectedModule = useCallback(
    (moduleCode: string) => {
      setSelectedModules((currentModules) =>
        currentModules.filter(
          (currentModule) => currentModule.code !== moduleCode,
        ),
      );

      const token = tokenRef.current;
      const plannedModuleId = plannedModuleIdsByCodeRef.current[moduleCode];
      const pendingCreate = pendingPlannedModuleCreatesRef.current[moduleCode];

      if (token && plannedModuleId) {
        void deletePlannedModule(token, plannedModuleId)
          .then(() => unregisterPlannedModule(moduleCode))
          .catch(() => undefined);
        return;
      }

      if (token && pendingCreate) {
        void pendingCreate
          .then((plannedModule) => deletePlannedModule(token, plannedModule.id))
          .then(() => unregisterPlannedModule(moduleCode))
          .catch(() => undefined);
      }
    },
    [unregisterPlannedModule],
  );

  const moveModuleToSelected = useCallback(
    (moduleCode: string, fallbackModule?: DashboardModule) => {
      const targetModule = findModuleByCode(moduleCode) ?? fallbackModule;

      if (!targetModule) {
        return;
      }

      removeModuleFromBuckets(moduleCode);

      setSelectedModules((currentModules) => {
        if (
          currentModules.some(
            (currentModule) => currentModule.code === moduleCode,
          )
        ) {
          return currentModules;
        }

        return [...currentModules, targetModule];
      });

      void persistModulePlacement(targetModule, 'SELECTED', null).catch(
        () => undefined,
      );
    },
    [findModuleByCode, persistModulePlacement, removeModuleFromBuckets],
  );

  const moveModuleToExempted = useCallback(
    (moduleCode: string, fallbackModule?: DashboardModule) => {
      const targetModule = findModuleByCode(moduleCode) ?? fallbackModule;

      if (!targetModule) {
        return;
      }

      removeModuleFromBuckets(moduleCode);

      setExemptedModules((currentModules) => {
        if (
          currentModules.some(
            (currentModule) => currentModule.code === moduleCode,
          )
        ) {
          return currentModules;
        }

        return [...currentModules, targetModule];
      });

      void persistModulePlacement(targetModule, 'EXEMPTED', null).catch(
        () => undefined,
      );
    },
    [findModuleByCode, persistModulePlacement, removeModuleFromBuckets],
  );

  const moveModuleToSemester = useCallback(
    (
      semesterKey: SemesterKey,
      moduleCode: string,
      fallbackModule?: DashboardModule,
    ) => {
      const targetModule = findModuleByCode(moduleCode) ?? fallbackModule;

      if (!targetModule) {
        return;
      }

      removeModuleFromBuckets(moduleCode);

      setSemesterModules((currentSemesters) => {
        const nextSemesters = { ...currentSemesters };

        nextSemesters[semesterKey] = [
          ...nextSemesters[semesterKey],
          targetModule,
        ];

        return nextSemesters;
      });

      void ensureSemester(semesterKey)
        .then((semester) => {
          if (semester) {
            return persistModulePlacement(targetModule, 'PLANNED', semester.id);
          }

          return undefined;
        })
        .catch(() => undefined);
    },
    [
      ensureSemester,
      findModuleByCode,
      persistModulePlacement,
      removeModuleFromBuckets,
    ],
  );

  const toggleSemesterCompletion = useCallback((semesterKey: SemesterKey) => {
    setCompletedSemesterKeys((currentCompletedSemesterKeys) => ({
      ...currentCompletedSemesterKeys,
      [semesterKey]: !currentCompletedSemesterKeys[semesterKey],
    }));
  }, []);

  const updateModuleActualGrade = useCallback(
    (moduleCode: string, actualGrade: DashboardGrade | null) => {
      const updateModule = (module: DashboardModule) =>
        module.code === moduleCode ? { ...module, actualGrade } : module;

      setSelectedModules((currentModules) => currentModules.map(updateModule));
      setExemptedModules((currentModules) => currentModules.map(updateModule));
      setSemesterModules((currentSemesters) => {
        const nextSemesters = { ...currentSemesters };

        Object.keys(nextSemesters).forEach((currentSemesterKey) => {
          const typedSemesterKey = currentSemesterKey as SemesterKey;
          nextSemesters[typedSemesterKey] =
            nextSemesters[typedSemesterKey].map(updateModule);
        });

        return nextSemesters;
      });

      void persistModuleActualGrade(moduleCode, actualGrade).catch(
        () => undefined,
      );
    },
    [persistModuleActualGrade],
  );

  const value = useMemo(
    () => ({
      completedSemesterKeys,
      exemptedModules,
      matriculationYear,
      semesterModules,
      selectedModules,
      addSelectedModule,
      isModuleInPlan,
      isModuleSelected,
      moveModuleToExempted,
      moveModuleToSelected,
      moveModuleToSemester,
      removeSelectedModule,
      toggleSemesterCompletion,
      updateModuleActualGrade,
    }),
    [
      addSelectedModule,
      completedSemesterKeys,
      exemptedModules,
      isModuleInPlan,
      isModuleSelected,
      moveModuleToExempted,
      moveModuleToSelected,
      moveModuleToSemester,
      matriculationYear,
      removeSelectedModule,
      selectedModules,
      semesterModules,
      toggleSemesterCompletion,
      updateModuleActualGrade,
    ],
  );

  return (
    <DashboardModuleSelectionContext.Provider value={value}>
      {children}
    </DashboardModuleSelectionContext.Provider>
  );
}

export function useDashboardModuleSelection() {
  const context = useContext(DashboardModuleSelectionContext);

  if (!context) {
    throw new Error(
      'useDashboardModuleSelection must be used within DashboardModuleSelectionProvider',
    );
  }

  return context;
}

export type { SemesterKey, SemesterNumber, YearNumber } from '@/shared/types';
