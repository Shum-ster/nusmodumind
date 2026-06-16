import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SemesterNumber, YearNumber } from '@/features/dashboard/DashboardModuleSelectionContext';

type ScrollFeatureProps = {
  semester: SemesterNumber;
  year: YearNumber;
  onPrevious: () => void;
  onNext: () => void;
};

export function ScrollFeature({ semester, year, onPrevious, onNext }: ScrollFeatureProps) {
  return (
    <div className="flex items-center justify-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Show previous semester"
        title="Previous semester"
        className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
      >
        <ChevronLeft aria-hidden="true" className="h-5 w-5" />
      </button>

      <p className="min-w-48 text-center text-lg font-bold text-gray-950">
        Year {year}, Semester {semester}
      </p>

      <button
        type="button"
        onClick={onNext}
        aria-label="Show next semester"
        title="Next semester"
        className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
      >
        <ChevronRight aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}
