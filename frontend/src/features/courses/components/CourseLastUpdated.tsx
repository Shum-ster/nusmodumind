'use client';

import { Clock } from 'lucide-react';
import { formatCourseDateTime } from '../course-utils';

type CourseLastUpdatedProps = {
  value?: string | null;
};

export function CourseLastUpdated({ value }: CourseLastUpdatedProps) {
  const formattedDate = formatCourseDateTime(value);

  if (!formattedDate) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600">
      <Clock className="h-4 w-4 text-orange-600" />
      <span>Last updated {formattedDate}</span>
    </div>
  );
}
