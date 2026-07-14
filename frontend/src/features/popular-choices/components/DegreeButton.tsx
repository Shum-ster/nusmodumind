import { GraduationCap } from 'lucide-react';

type DegreeButtonProps = {
  title: string;
  onClick: () => void;
};

export function DegreeButton({ title, onClick }: DegreeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-bold text-gray-900 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-orange-200 bg-orange-50 text-orange-700">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="min-w-0 leading-5">{title}</span>
    </button>
  );
}
