import { Check, X } from 'lucide-react';

type SemesterCompletionToggleProps = {
  isCompleted: boolean;
  onToggle: () => void;
  semesterName: string;
};

export function SemesterCompletionToggle({
  isCompleted,
  onToggle,
  semesterName,
}: SemesterCompletionToggleProps) {
  const Icon = isCompleted ? X : Check;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={isCompleted ? `Mark ${semesterName} as planned` : `Mark ${semesterName} as completed`}
      aria-label={isCompleted ? `Mark ${semesterName} as planned` : `Mark ${semesterName} as completed`}
      aria-pressed={isCompleted}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-sm border text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isCompleted
          ? 'border-red-600 bg-red-600 hover:bg-red-700 focus:ring-red-500'
          : 'border-green-600 bg-green-600 hover:bg-green-700 focus:ring-green-500'
      }`}
    >
      <Icon aria-hidden="true" className="h-4 w-4 stroke-[3]" />
    </button>
  );
}

export const CompletedSemester = SemesterCompletionToggle;
