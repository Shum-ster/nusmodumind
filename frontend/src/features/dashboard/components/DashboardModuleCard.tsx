import type { DashboardModule } from '../types';

type DashboardModuleCardProps = {
  module: DashboardModule;
  className?: string;
  showMetrics?: boolean;
  showTitle?: boolean;
};

function getGridColumns(showTitle: boolean, showMetrics: boolean) {
  if (showTitle && showMetrics) {
    return 'grid-cols-[minmax(6rem,8rem)_minmax(0,1fr)_auto_auto]';
  }

  if (showTitle) {
    return 'grid-cols-[minmax(5rem,6rem)_minmax(0,1fr)]';
  }

  return 'grid-cols-[minmax(4.5rem,1fr)_auto_auto]';
}

export function DashboardModuleCard({
  module,
  className = '',
  showMetrics = true,
  showTitle = true,
}: DashboardModuleCardProps) {
  return (
    <article
      className={`grid min-h-12 ${getGridColumns(showTitle, showMetrics)} items-center gap-3 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ${className}`}
    >
      <p className="truncate font-bold text-orange-600">{module.code}</p>
      {showTitle && <p className="min-w-0 truncate font-medium text-gray-800">{module.title}</p>}
      {showMetrics && (
        <>
          <p className="whitespace-nowrap text-right text-xs font-semibold text-gray-600">{module.credits} units</p>
          <p className="whitespace-nowrap text-right text-xs font-semibold text-gray-600">
            {module.estimatedWorkload.toFixed(1)} hrs/wk
          </p>
        </>
      )}
    </article>
  );
}
