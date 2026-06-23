import type { DragEvent } from 'react';
import type { DashboardModule } from './types';

const dashboardModuleDragType = 'application/x-nusmodumind-dashboard-module';

type DashboardModuleDropData = {
  module?: DashboardModule;
  moduleCode: string;
};

export function setDashboardModuleDragData(event: DragEvent<HTMLElement>, module: DashboardModule) {
  event.dataTransfer.setData(dashboardModuleDragType, JSON.stringify(module));
  event.dataTransfer.setData('text/plain', module.code);
  event.dataTransfer.effectAllowed = 'move';
}

export function getDashboardModuleDropData(event: DragEvent<HTMLElement>): DashboardModuleDropData | null {
  const serializedModule = event.dataTransfer.getData(dashboardModuleDragType);

  if (serializedModule) {
    try {
      const dashboardModule = JSON.parse(serializedModule) as DashboardModule;

      if (dashboardModule.code) {
        return {
          module: dashboardModule,
          moduleCode: dashboardModule.code,
        };
      }
    } catch {
      // Fall through to the plain-text module code fallback.
    }
  }

  const moduleCode = event.dataTransfer.getData('text/plain');

  return moduleCode ? { moduleCode } : null;
}
