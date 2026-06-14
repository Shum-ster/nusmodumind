import type { MockNusModule } from '../mockModules';

type ModuleNameLayoutProps = {
  module: MockNusModule;
  className?: string;
};

export function ModuleNameLayout({ module, className = '' }: ModuleNameLayoutProps) {
  return (
    <article className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ${className}`}>
      <p className="min-w-0 truncate font-medium text-gray-800">
        <span className="font-bold text-orange-600">{module.code}</span>
        <span className="text-gray-500"> - </span>
        {module.title}
      </p>
      <p className="whitespace-nowrap text-right text-xs font-medium text-gray-600">
        {module.credits} MC · {module.estimatedWorkload}/5
      </p>
    </article>
  );
}
