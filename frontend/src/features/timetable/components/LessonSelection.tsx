import type { CSSProperties } from 'react';
import type { TimetableLesson } from '../adapters/current-user-timetable-adapter';

type LessonSelectionVariant = 'selected' | 'available';

type LessonSelectionPalette = {
  active: string;
  available: string;
  availableHover: string;
  selected: string;
};

type LessonSelectionProps = {
  isActive: boolean;
  isPending: boolean;
  lesson: TimetableLesson;
  onSelect: () => void;
  palette: LessonSelectionPalette;
  style: CSSProperties;
  variant: LessonSelectionVariant;
};

export function LessonSelection({
  isActive,
  isPending,
  lesson,
  onSelect,
  palette,
  style,
  variant,
}: LessonSelectionProps) {
  const colorClass = variant === 'available' ? palette.available : palette.selected;
  const hoverClass = variant === 'available' ? palette.availableHover : '';
  const activeClass = isActive ? palette.active : '';

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isPending}
      style={style}
      className={`z-10 flex min-h-0 min-w-0 flex-col gap-1 rounded border p-1.5 text-left text-[9px] font-medium leading-tight shadow-sm transition ${colorClass} ${hoverClass} ${activeClass} ${isPending ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
    >
      <span className="grid min-w-0 gap-1">
        <span className="break-all font-bold leading-none">{lesson.moduleCode}</span>
        <span className="max-w-full break-words rounded-sm bg-white/60 px-1 py-0.5 text-[8px] font-bold leading-none">
          {lesson.lessonType}
          <span className="block break-all">{lesson.classNo}</span>
        </span>
      </span>

      <span className="mt-auto grid min-w-0 gap-0.5">
        <span className="break-words">{lesson.venue}</span>
        {lesson.weeks ? <span className="break-words">Wk {lesson.weeks}</span> : null}
      </span>
    </button>
  );
}

export type { LessonSelectionPalette, LessonSelectionVariant };
