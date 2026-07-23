import type {
  DashboardModule,
  SemesterKey,
  SemesterNumber,
  UnsatisfiedModuleIssue,
  YearNumber,
} from '@/shared/types';
import { buildUnsatisfiedModuleIssues } from './dashboard-validation';

export type DashboardPlanSnapshotModule = {
  code: string;
  title: string;
  credits: number;
};

export type DashboardPlanSnapshotSemester = {
  key: SemesterKey;
  label: string;
  modules: DashboardPlanSnapshotModule[];
};

export type DashboardPlanSnapshotYear = {
  academicYear: string;
  label: string;
  semesters: DashboardPlanSnapshotSemester[];
};

export type DashboardPlanSnapshot = {
  exemptedModules: DashboardPlanSnapshotModule[];
  generatedAt: string;
  matriculationYear: number;
  selectedModules: DashboardPlanSnapshotModule[];
  years: DashboardPlanSnapshotYear[];
};

export type DashboardPlanState = {
  exemptedModules: DashboardModule[];
  matriculationYear: number;
  selectedModules: DashboardModule[];
  semesterModules: Record<SemesterKey, DashboardModule[]>;
};

export type DashboardPlanDraft = {
  planImageDataUrl: string;
  snapshot: DashboardPlanSnapshot;
};

const dashboardPlanDraftStorageKey = 'nusmodumind:dashboard-plan-draft';
const yearNumbers: YearNumber[] = [1, 2, 3, 4];
const semesterNumbers: SemesterNumber[] = [1, 2];
const canvasWidth = 1600;
const pagePadding = 72;
const sectionGap = 28;
const rowHeight = 44;
const moduleGap = 10;

export function buildDashboardPlanSnapshot({
  exemptedModules,
  matriculationYear,
  selectedModules,
  semesterModules,
}: DashboardPlanState): DashboardPlanSnapshot {
  return {
    exemptedModules: exemptedModules.map(toSnapshotModule),
    generatedAt: new Date().toISOString(),
    matriculationYear,
    selectedModules: selectedModules.map(toSnapshotModule),
    years: yearNumbers.map((yearNumber) => {
      const academicYearStart = matriculationYear + yearNumber - 1;

      return {
        academicYear: `${academicYearStart}/${academicYearStart + 1}`,
        label: `Year ${yearNumber}`,
        semesters: semesterNumbers.map((semesterNumber) => {
          const semesterKey =
            `year-${yearNumber}-semester-${semesterNumber}` as SemesterKey;

          return {
            key: semesterKey,
            label: `Semester ${semesterNumber}`,
            modules: semesterModules[semesterKey].map(toSnapshotModule),
          };
        }),
      };
    }),
  };
}

export function buildDashboardPlanIssues({
  exemptedModules,
  semesterModules,
}: Pick<DashboardPlanState, 'exemptedModules' | 'semesterModules'>) {
  return Object.entries(semesterModules).flatMap(([semesterKey, modules]) =>
    buildUnsatisfiedModuleIssues({
      exemptedModules,
      modules,
      semesterKey: semesterKey as SemesterKey,
      semesterModules,
    }),
  );
}

export function formatDashboardPlanIssueMessage(
  issues: UnsatisfiedModuleIssue[],
) {
  if (issues.length === 0) {
    return null;
  }

  const formattedIssues = issues
    .slice(0, 4)
    .map((issue) => `${issue.moduleCode}: ${issue.reasons.join(' ')}`);
  const overflowCount = issues.length - formattedIssues.length;

  return [
    'Resolve prerequisite issues before exporting or submitting:',
    ...formattedIssues,
    ...(overflowCount > 0 ? [`${overflowCount} more issue(s).`] : []),
  ].join('\n');
}

export async function renderDashboardPlanImage(
  snapshot: DashboardPlanSnapshot,
) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create the degree plan image.');
  }

  const height = measureSnapshotHeight(snapshot);
  canvas.width = canvasWidth;
  canvas.height = height;

  context.fillStyle = '#f9fafb';
  context.fillRect(0, 0, canvas.width, canvas.height);

  let y = pagePadding;
  context.fillStyle = '#111827';
  context.font = '700 48px Arial, sans-serif';
  context.fillText('Degree Plan', pagePadding, y);
  y += 34;

  context.fillStyle = '#6b7280';
  context.font = '500 22px Arial, sans-serif';
  context.fillText(
    `Matriculation year ${snapshot.matriculationYear}`,
    pagePadding,
    y,
  );
  y += 48;

  snapshot.years.forEach((year) => {
    y = drawSectionHeader(context, year.label, `AY ${year.academicYear}`, y);

    year.semesters.forEach((semester) => {
      y = drawModuleGroup(context, semester.label, semester.modules, y);
    });

    y += sectionGap;
  });

  y = drawSectionHeader(context, 'Selected Modules', '', y);
  y = drawModuleGroup(context, 'Not placed in a semester', snapshot.selectedModules, y);
  y += sectionGap;

  y = drawSectionHeader(context, 'Exempted Modules', '', y);
  drawModuleGroup(context, 'Exempted', snapshot.exemptedModules, y);

  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

export function saveDashboardPlanDraft(draft: DashboardPlanDraft) {
  window.sessionStorage.setItem(
    dashboardPlanDraftStorageKey,
    JSON.stringify(draft),
  );
}

export function readDashboardPlanDraft() {
  const value = window.sessionStorage.getItem(dashboardPlanDraftStorageKey);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as DashboardPlanDraft;
  } catch {
    return null;
  }
}

function toSnapshotModule(module: DashboardModule): DashboardPlanSnapshotModule {
  return {
    code: module.code,
    credits: module.credits,
    title: module.title,
  };
}

function measureSnapshotHeight(snapshot: DashboardPlanSnapshot) {
  const yearHeights = snapshot.years.reduce(
    (totalHeight, year) =>
      totalHeight +
      62 +
      year.semesters.reduce(
        (semesterHeight, semester) =>
          semesterHeight + measureModuleGroupHeight(semester.modules),
        0,
      ) +
      sectionGap,
    0,
  );

  return (
    pagePadding +
    82 +
    yearHeights +
    62 +
    measureModuleGroupHeight(snapshot.selectedModules) +
    sectionGap +
    62 +
    measureModuleGroupHeight(snapshot.exemptedModules) +
    pagePadding
  );
}

function measureModuleGroupHeight(modules: DashboardPlanSnapshotModule[]) {
  return 48 + Math.max(1, modules.length) * (rowHeight + moduleGap) + 12;
}

function drawSectionHeader(
  context: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  y: number,
) {
  context.fillStyle = '#111827';
  context.font = '700 30px Arial, sans-serif';
  context.fillText(title, pagePadding, y);

  if (subtitle) {
    context.fillStyle = '#6b7280';
    context.font = '600 18px Arial, sans-serif';
    context.fillText(subtitle, pagePadding + 180, y);
  }

  return y + 28;
}

function drawModuleGroup(
  context: CanvasRenderingContext2D,
  label: string,
  modules: DashboardPlanSnapshotModule[],
  y: number,
) {
  const x = pagePadding;
  const width = canvasWidth - pagePadding * 2;

  context.fillStyle = '#374151';
  context.font = '700 22px Arial, sans-serif';
  context.fillText(label, x, y);
  y += 22;

  const rows = modules.length > 0 ? modules : null;

  if (!rows) {
    drawRoundedRect(context, x, y, width, rowHeight, 10, '#ffffff', '#d1d5db');
    context.fillStyle = '#9ca3af';
    context.font = '500 18px Arial, sans-serif';
    context.fillText('No modules added.', x + 20, y + 28);
    return y + rowHeight + 20;
  }

  rows.forEach((module) => {
    drawRoundedRect(context, x, y, width, rowHeight, 10, '#ffffff', '#e5e7eb');
    context.fillStyle = '#ea580c';
    context.font = '700 19px Arial, sans-serif';
    context.fillText(module.code, x + 20, y + 28);

    context.fillStyle = '#111827';
    context.font = '600 18px Arial, sans-serif';
    context.fillText(truncateText(context, module.title, width - 290), x + 150, y + 28);

    context.fillStyle = '#4b5563';
    context.font = '700 17px Arial, sans-serif';
    context.fillText(`${module.credits} MC`, x + width - 90, y + 28);

    y += rowHeight + moduleGap;
  });

  return y + 10;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
  strokeStyle: string,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
  context.strokeStyle = strokeStyle;
  context.lineWidth = 2;
  context.stroke();
}

function truncateText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let truncatedText = text;

  while (
    truncatedText.length > 1 &&
    context.measureText(`${truncatedText}...`).width > maxWidth
  ) {
    truncatedText = truncatedText.slice(0, -1);
  }

  return `${truncatedText}...`;
}
