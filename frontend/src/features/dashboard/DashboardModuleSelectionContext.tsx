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
  getAcadYearForSemesterKey,
  getEffectiveMatriculationYear,
  getSemesterKeyFromRecord,
  parseSemesterKey,
  type PlannedModuleRecord,
  type PlannedModuleStatus,
  type SemesterRecord,
} from '@/features/planner';
import { useUserProfile } from '@/features/user';
import {
  isModuleSuEligible,
  normalizeModuleActualGrade,
  type DashboardGrade,
} from './dashboard-grades';
import type { DashboardModule, SemesterKey } from '@/shared/types';

type DashboardModuleSelectionContextValue = {
  completedSemesterKeys: Record<SemesterKey, boolean>;
  exemptedModules: DashboardModule[];
  matriculationYear: number;
  planSaveError: string | null;
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
  waitForPendingPlanWrites: () => Promise<void>;
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
    gradingBasisDescription: plannedModule.module.gradingBasisDescription,
    actualGrade: normalizeModuleActualGrade(
      plannedModule.actualGrade,
      plannedModule.module.gradingBasisDescription,
    ),
    isSuEligible: isModuleSuEligible(plannedModule.module.attributes),
    prerequisite: plannedModule.module.prerequisite,
    semesterData: plannedModule.module.semesterData,
    sourceAcadYear: plannedModule.module.sourceAcadYear,
  };
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

function buildDashboardPlanState(
  plan: Awaited<ReturnType<typeof getCurrentUserPlan>>,
  matriculationYear: number,
) {
  const exemptedModules: DashboardModule[] = [];
  const selectedModules: DashboardModule[] = [];
  const completedSemesterKeys = cloneInitialCompletedSemesterKeys();
  const semesterModules = cloneInitialSemesterModules();
  const plannedModuleIdsByCode: PlannedModuleIdsByCode = {};
  const semesterRecordsByKey: SemesterRecordsByKey = {};

  plan.semesters.forEach((semester) => {
    const semesterKey = getSemesterKeyFromRecord(semester, matriculationYear);

    if (semesterKey) {
      semesterRecordsByKey[semesterKey] = semester;
    }
  });

  plan.plannedModules.forEach((plannedModule) => {
    const dashboardModule = toDashboardModule(plannedModule);

    plannedModuleIdsByCode[dashboardModule.code] = plannedModule.id;

    if (plannedModule.status === 'EXEMPTED') {
      exemptedModules.push(dashboardModule);
      return;
    }

    if (plannedModule.status === 'PLANNED' && plannedModule.semester) {
      const semesterKey = getSemesterKeyFromRecord(
        plannedModule.semester,
        matriculationYear,
      );

      if (semesterKey) {
        semesterModules[semesterKey] = [
          ...semesterModules[semesterKey],
          dashboardModule,
        ];
        completedSemesterKeys[semesterKey] =
          completedSemesterKeys[semesterKey] ||
          dashboardModule.actualGrade !== null;
        semesterRecordsByKey[semesterKey] = plannedModule.semester;
        return;
      }
    }

    selectedModules.push(dashboardModule);
  });

  return {
    completedSemesterKeys,
    exemptedModules,
    plannedModuleIdsByCode,
    selectedModules,
    semesterModules,
    semesterRecordsByKey,
  };
}

export function DashboardModuleSelectionProvider({
  children,
}: DashboardModuleSelectionProviderProps) {
  const { profile } = useUserProfile();
  const matriculationYear = getEffectiveMatriculationYear(profile);
  const [completedSemesterKeys, setCompletedSemesterKeys] = useState(
    cloneInitialCompletedSemesterKeys,
  );
  const [exemptedModules, setExemptedModules] = useState<DashboardModule[]>([]);
  const [planSaveError, setPlanSaveError] = useState<string | null>(null);
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
  const pendingPlanWritesRef = useRef<Set<Promise<void>>>(new Set());
  const lastPlanWriteErrorRef = useRef<unknown>(null);
  const semesterRecordsByKeyRef = useRef<SemesterRecordsByKey>({});
  const matriculationYearRef = useRef(matriculationYear);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    plannedModuleIdsByCodeRef.current = plannedModuleIdsByCode;
  }, [plannedModuleIdsByCode]);

  useEffect(() => {
    matriculationYearRef.current = matriculationYear;
  }, [matriculationYear]);

  const applyPlan = useCallback(
    (
      plan: Awaited<ReturnType<typeof getCurrentUserPlan>>,
      planMatriculationYear: number,
    ) => {
      const nextState = buildDashboardPlanState(plan, planMatriculationYear);

      plannedModuleIdsByCodeRef.current = nextState.plannedModuleIdsByCode;
      semesterRecordsByKeyRef.current = nextState.semesterRecordsByKey;
      setCompletedSemesterKeys(nextState.completedSemesterKeys);
      setExemptedModules(nextState.exemptedModules);
      setSelectedModules(nextState.selectedModules);
      setSemesterModules(nextState.semesterModules);
      setPlannedModuleIdsByCode(nextState.plannedModuleIdsByCode);
      setSemesterRecordsByKey(nextState.semesterRecordsByKey);
    },
    [],
  );

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

        applyPlan(plan, matriculationYear);
      })
      .catch(() => {
        // Keep the optimistic local dashboard usable if hydration fails.
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [applyPlan, matriculationYear]);

  const restorePlanFromServer = useCallback(async () => {
    const token = tokenRef.current;

    if (!token) {
      return;
    }

    const plan = await getCurrentUserPlan(token);
    applyPlan(plan, matriculationYearRef.current);
  }, [applyPlan]);

  const trackPlanWrite = useCallback(
    (write: Promise<unknown>) => {
      setPlanSaveError(null);

      const trackedWrite = write
        .then(() => undefined)
        .catch(async (error: unknown) => {
          lastPlanWriteErrorRef.current = error;
          setPlanSaveError(
            'Unable to save the latest plan change. The dashboard was restored to the saved plan.',
          );

          try {
            await restorePlanFromServer();
          } catch {
            setPlanSaveError(
              'Unable to save or reload the plan. Refresh before making more changes.',
            );
          }

          throw error;
        })
        .finally(() => {
          pendingPlanWritesRef.current.delete(trackedWrite);
        });

      pendingPlanWritesRef.current.add(trackedWrite);
      void trackedWrite.catch(() => undefined);
    },
    [restorePlanFromServer],
  );

  const waitForPendingPlanWrites = useCallback(async () => {
    while (pendingPlanWritesRef.current.size > 0) {
      await Promise.allSettled(Array.from(pendingPlanWritesRef.current));
    }

    if (lastPlanWriteErrorRef.current) {
      const error = lastPlanWriteErrorRef.current;
      lastPlanWriteErrorRef.current = null;
      throw error;
    }
  }, []);

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

      trackPlanWrite(
        persistModulePlacement(selectedModule, 'SELECTED', null),
      );
    },
    [
      exemptedModules,
      persistModulePlacement,
      semesterModules,
      trackPlanWrite,
    ],
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
        trackPlanWrite(
          deletePlannedModule(token, plannedModuleId).then(() =>
            unregisterPlannedModule(moduleCode),
          ),
        );
        return;
      }

      if (token && pendingCreate) {
        trackPlanWrite(
          pendingCreate
            .then((plannedModule) =>
              deletePlannedModule(token, plannedModule.id),
            )
            .then(() => unregisterPlannedModule(moduleCode)),
        );
      }
    },
    [trackPlanWrite, unregisterPlannedModule],
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

      trackPlanWrite(persistModulePlacement(targetModule, 'SELECTED', null));
    },
    [
      findModuleByCode,
      persistModulePlacement,
      removeModuleFromBuckets,
      trackPlanWrite,
    ],
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

      trackPlanWrite(persistModulePlacement(targetModule, 'EXEMPTED', null));
    },
    [
      findModuleByCode,
      persistModulePlacement,
      removeModuleFromBuckets,
      trackPlanWrite,
    ],
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

      trackPlanWrite(
        ensureSemester(semesterKey).then((semester) => {
          if (semester) {
            return persistModulePlacement(targetModule, 'PLANNED', semester.id);
          }

          return undefined;
        }),
      );
    },
    [
      ensureSemester,
      findModuleByCode,
      persistModulePlacement,
      removeModuleFromBuckets,
      trackPlanWrite,
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

      trackPlanWrite(persistModuleActualGrade(moduleCode, actualGrade));
    },
    [persistModuleActualGrade, trackPlanWrite],
  );

  const value = useMemo(
    () => ({
      completedSemesterKeys,
      exemptedModules,
      matriculationYear,
      planSaveError,
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
      waitForPendingPlanWrites,
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
      planSaveError,
      removeSelectedModule,
      selectedModules,
      semesterModules,
      toggleSemesterCompletion,
      updateModuleActualGrade,
      waitForPendingPlanWrites,
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
