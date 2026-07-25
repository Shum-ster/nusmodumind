import type { NusModule } from '@prisma/client';
import type { NusModsModuleInfo } from '../shared/types';

export type FetchedNusModsModule = {
  moduleInfo: NusModsModuleInfo;
  hasDetailedSemesterData: boolean;
};

export type NusModuleChangeSnapshot = Pick<
  NusModule,
  | 'moduleCode'
  | 'title'
  | 'moduleCredit'
  | 'gradingBasisDescription'
  | 'prerequisite'
  | 'preclusion'
  | 'corequisite'
  | 'workload'
  | 'semesterData'
  | 'attributes'
>;

export type ModuleChangeCategory =
  | 'attributes'
  | 'availability'
  | 'exam'
  | 'module'
  | 'requirements'
  | 'schedule'
  | 'workload';

export type ModuleChange = {
  category: ModuleChangeCategory;
  summary: string;
};

export type DetectedModuleChanges = {
  moduleCode: string;
  moduleTitle: string;
  globalChanges: ModuleChange[];
  semesterChanges: Record<number, ModuleChange[]>;
};

export type ModuleUpdateNotificationPayload = {
  moduleTitle: string;
  changes: ModuleChange[];
};
