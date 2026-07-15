import type {
  DashboardModule,
  NusModsSemesterData,
  SemesterKey,
  SemesterNumber,
  UnsatisfiedModuleIssue,
  YearNumber,
} from '@/shared/types';
import { isGradePassingPrerequisite } from './dashboard-grades';

export type { UnsatisfiedModuleIssue } from '@/shared/types';

type BuildUnsatisfiedModuleIssuesOptions = {
  exemptedModules: DashboardModule[];
  modules: DashboardModule[];
  semesterKey: SemesterKey;
  semesterModules: Record<SemesterKey, DashboardModule[]>;
};

const moduleCodePattern = /\b[A-Z]{2,4}\d{4}[A-Z]{0,3}\b/g;

export function buildUnsatisfiedModuleIssues({
  exemptedModules,
  modules,
  semesterKey,
  semesterModules,
}: BuildUnsatisfiedModuleIssuesOptions) {
  const issuesByModuleCode = new Map<string, string[]>();

  modules.forEach((module) => {
    const prerequisiteIssue = getPrerequisiteIssue(module, semesterKey, semesterModules, exemptedModules);

    if (prerequisiteIssue) {
      addIssue(issuesByModuleCode, module.code, prerequisiteIssue);
    }
  });

  getExamClashIssues(modules, getSemesterNumber(semesterKey)).forEach(({ moduleCode, reason }) => {
    addIssue(issuesByModuleCode, moduleCode, reason);
  });

  return Array.from(issuesByModuleCode.entries()).map(([moduleCode, reasons]) => ({
    moduleCode,
    reasons,
  }));
}

function addIssue(issuesByModuleCode: Map<string, string[]>, moduleCode: string, reason: string) {
  const currentReasons = issuesByModuleCode.get(moduleCode) ?? [];

  issuesByModuleCode.set(moduleCode, [...currentReasons, reason]);
}

function getPrerequisiteIssue(
  module: DashboardModule,
  semesterKey: SemesterKey,
  semesterModules: Record<SemesterKey, DashboardModule[]>,
  exemptedModules: DashboardModule[],
) {
  const prerequisiteModuleCodes = extractPrerequisiteModuleCodes(module.prerequisite);

  if (prerequisiteModuleCodes.length === 0) {
    return null;
  }

  const completedModuleCodes = new Set([
    ...exemptedModules.map((currentModule) => currentModule.code),
    ...getPreviousSemesterModules(semesterKey, semesterModules)
      .filter((currentModule) => isGradePassingPrerequisite(currentModule.actualGrade))
      .map((currentModule) => currentModule.code),
  ]);
  const hasSatisfiedPrerequisite = prerequisiteModuleCodes.some((moduleCode) => completedModuleCodes.has(moduleCode));

  if (hasSatisfiedPrerequisite) {
    return null;
  }

  return `Prerequisite not satisfied. Complete one of ${prerequisiteModuleCodes.join(', ')} first.`;
}

function extractPrerequisiteModuleCodes(prerequisite?: string | null) {
  if (!prerequisite) {
    return [];
  }

  return Array.from(new Set(prerequisite.match(moduleCodePattern) ?? []));
}

function getPreviousSemesterModules(
  semesterKey: SemesterKey,
  semesterModules: Record<SemesterKey, DashboardModule[]>,
) {
  const targetOrder = getSemesterOrder(semesterKey);

  return Object.entries(semesterModules).flatMap(([currentSemesterKey, modules]) => (
    getSemesterOrder(currentSemesterKey as SemesterKey) < targetOrder ? modules : []
  ));
}

function getSemesterOrder(semesterKey: SemesterKey) {
  const [, yearText, , semesterText] = semesterKey.split('-');
  const yearNumber = Number(yearText) as YearNumber;
  const semesterNumber = Number(semesterText) as SemesterNumber;

  return (yearNumber - 1) * 2 + semesterNumber;
}

function getSemesterNumber(semesterKey: SemesterKey) {
  const semesterText = semesterKey.split('-')[3];

  return Number(semesterText) as SemesterNumber;
}

function getExamClashIssues(modules: DashboardModule[], semesterNumber: SemesterNumber) {
  const modulesByExamDate = modules.reduce((examDateMap, module) => {
    const examDate = getModuleExamDate(module, semesterNumber);

    if (!examDate) {
      return examDateMap;
    }

    const modulesForDate = examDateMap.get(examDate) ?? [];
    examDateMap.set(examDate, [...modulesForDate, module]);

    return examDateMap;
  }, new Map<string, DashboardModule[]>());

  return Array.from(modulesByExamDate.values()).flatMap((modulesForDate) => {
    if (modulesForDate.length < 2) {
      return [];
    }

    return modulesForDate.map((module) => {
      const clashingModuleCodes = modulesForDate
        .filter((currentModule) => currentModule.code !== module.code)
        .map((currentModule) => currentModule.code)
        .join(', ');

      return {
        moduleCode: module.code,
        reason: `Exam timing clashes with ${clashingModuleCodes}.`,
      };
    });
  });
}

function getModuleExamDate(module: DashboardModule, semesterNumber: SemesterNumber) {
  if (!Array.isArray(module.semesterData)) {
    return null;
  }

  const semesterData = module.semesterData as NusModsSemesterData[];
  const matchingSemester = semesterData.find((semester) => Number(semester.semester) === semesterNumber);
  const examDate = matchingSemester?.examDate;

  return typeof examDate === 'string' ? examDate : null;
}
