'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { DashboardModule } from './types';

type YearNumber = 1 | 2 | 3 | 4;
type SemesterNumber = 1 | 2;
type SemesterKey = `year-${YearNumber}-semester-${SemesterNumber}`;

type DashboardModuleSelectionContextValue = {
  exemptedModules: DashboardModule[];
  semesterModules: Record<SemesterKey, DashboardModule[]>;
  selectedModules: DashboardModule[];
  addSelectedModule: (module: DashboardModule) => void;
  isModuleInPlan: (moduleCode: string) => boolean;
  isModuleSelected: (moduleCode: string) => boolean;
  moveModuleToExempted: (moduleCode: string, fallbackModule?: DashboardModule) => void;
  moveModuleToSelected: (moduleCode: string, fallbackModule?: DashboardModule) => void;
  moveModuleToSemester: (semesterKey: SemesterKey, moduleCode: string, fallbackModule?: DashboardModule) => void;
  removeSelectedModule: (moduleCode: string) => void;
};

const DashboardModuleSelectionContext = createContext<DashboardModuleSelectionContextValue | null>(null);

type DashboardModuleSelectionProviderProps = {
  children: ReactNode;
};

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

export function DashboardModuleSelectionProvider({ children }: DashboardModuleSelectionProviderProps) {
  const [exemptedModules, setExemptedModules] = useState<DashboardModule[]>([]);
  const [selectedModules, setSelectedModules] = useState<DashboardModule[]>([]);
  const [semesterModules, setSemesterModules] = useState(initialSemesterModules);

  const addSelectedModule = useCallback((selectedModule: DashboardModule) => {
    const isAlreadyPlanned = exemptedModules.some((currentModule) => currentModule.code === selectedModule.code)
      || Object.values(semesterModules)
        .flat()
        .some((currentModule) => currentModule.code === selectedModule.code);

    if (isAlreadyPlanned) {
      return;
    }

    setSelectedModules((currentModules) => {
      if (currentModules.some((currentModule) => currentModule.code === selectedModule.code)) {
        return currentModules;
      }

      return [...currentModules, selectedModule];
    });
  }, [exemptedModules, semesterModules]);

  const isModuleSelected = useCallback(
    (moduleCode: string) => selectedModules.some((selectedModule) => selectedModule.code === moduleCode),
    [selectedModules],
  );

  const findModuleByCode = useCallback((moduleCode: string) => (
    selectedModules.find((currentModule) => currentModule.code === moduleCode)
    ?? exemptedModules.find((currentModule) => currentModule.code === moduleCode)
    ?? Object.values(semesterModules)
      .flat()
      .find((currentModule) => currentModule.code === moduleCode)
  ), [exemptedModules, selectedModules, semesterModules]);

  const isModuleInPlan = useCallback((moduleCode: string) => Boolean(findModuleByCode(moduleCode)), [findModuleByCode]);

  const removeModuleFromSemesters = useCallback((moduleCode: string) => {
    setSemesterModules((currentSemesters) => {
      const nextSemesters = { ...currentSemesters };

      Object.keys(nextSemesters).forEach((currentSemesterKey) => {
        const typedSemesterKey = currentSemesterKey as SemesterKey;
        nextSemesters[typedSemesterKey] = nextSemesters[typedSemesterKey].filter(
          (semesterModule) => semesterModule.code !== moduleCode,
        );
      });

      return nextSemesters;
    });
  }, []);

  const removeModuleFromBuckets = useCallback((moduleCode: string) => {
    removeModuleFromSemesters(moduleCode);
    setExemptedModules((currentModules) => (
      currentModules.filter((currentModule) => currentModule.code !== moduleCode)
    ));
    setSelectedModules((currentModules) => (
      currentModules.filter((currentModule) => currentModule.code !== moduleCode)
    ));
  }, [removeModuleFromSemesters]);

  const removeSelectedModule = useCallback((moduleCode: string) => {
    setSelectedModules((currentModules) => (
      currentModules.filter((currentModule) => currentModule.code !== moduleCode)
    ));
  }, []);

  const moveModuleToSelected = useCallback((moduleCode: string, fallbackModule?: DashboardModule) => {
    const targetModule = findModuleByCode(moduleCode) ?? fallbackModule;

    if (!targetModule) {
      return;
    }

    removeModuleFromBuckets(moduleCode);

    setSelectedModules((currentModules) => {
      if (currentModules.some((currentModule) => currentModule.code === moduleCode)) {
        return currentModules;
      }

      return [...currentModules, targetModule];
    });
  }, [findModuleByCode, removeModuleFromBuckets]);

  const moveModuleToExempted = useCallback((moduleCode: string, fallbackModule?: DashboardModule) => {
    const targetModule = findModuleByCode(moduleCode) ?? fallbackModule;

    if (!targetModule) {
      return;
    }

    removeModuleFromBuckets(moduleCode);

    setExemptedModules((currentModules) => {
      if (currentModules.some((currentModule) => currentModule.code === moduleCode)) {
        return currentModules;
      }

      return [...currentModules, targetModule];
    });
  }, [findModuleByCode, removeModuleFromBuckets]);

  const moveModuleToSemester = useCallback((semesterKey: SemesterKey, moduleCode: string, fallbackModule?: DashboardModule) => {
    const targetModule = findModuleByCode(moduleCode) ?? fallbackModule;

    if (!targetModule) {
      return;
    }

    removeModuleFromBuckets(moduleCode);

    setSemesterModules((currentSemesters) => {
      const nextSemesters = { ...currentSemesters };

      nextSemesters[semesterKey] = [...nextSemesters[semesterKey], targetModule];

      return nextSemesters;
    });
  }, [findModuleByCode, removeModuleFromBuckets]);

  const value = useMemo(
    () => ({
      exemptedModules,
      semesterModules,
      selectedModules,
      addSelectedModule,
      isModuleInPlan,
      isModuleSelected,
      moveModuleToExempted,
      moveModuleToSelected,
      moveModuleToSemester,
      removeSelectedModule,
    }),
    [
      addSelectedModule,
      exemptedModules,
      isModuleInPlan,
      isModuleSelected,
      moveModuleToExempted,
      moveModuleToSelected,
      moveModuleToSemester,
      removeSelectedModule,
      selectedModules,
      semesterModules,
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
    throw new Error('useDashboardModuleSelection must be used within DashboardModuleSelectionProvider');
  }

  return context;
}

export type { SemesterKey, SemesterNumber, YearNumber };
