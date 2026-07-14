import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

type ScrollFeatureProps = {
  semester: number;
  year: number;
  isDownloadDisabled?: boolean;
  onDownload: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function ScrollFeature({
  semester,
  year,
  isDownloadDisabled = false,
  onDownload,
  onPrevious,
  onNext,
}: ScrollFeatureProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div />

      <div className="flex items-center justify-center gap-4">
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloadDisabled}
          aria-label="Download timetable image"
          title="Download timetable image"
          className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
