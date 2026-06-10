import type { MockNusModule } from '../mockModules';

type ModuleNameLayoutProps = {
  module: MockNusModule;
};

export function ModuleNameLayout({ module }: ModuleNameLayoutProps) {
  return (
    <article className="grid grid-cols-[76px_1fr_58px_96px] items-center gap-3 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm">
      <p className="font-bold text-orange-600">{module.code}</p>
      <p className="truncate font-medium text-gray-800">{module.title}</p>
      <p className="text-right text-gray-600">{module.credits} MC</p>
      <p className="text-right text-gray-600">{module.estimatedWorkload}/5</p>
    </article>
  );
}
