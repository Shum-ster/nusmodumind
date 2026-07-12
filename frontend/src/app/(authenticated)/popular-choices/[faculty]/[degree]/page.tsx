import { notFound } from 'next/navigation';

import { PopularChoicesDegreePage } from '@/features/popular-choices';
import {
  getPopularChoiceDegree,
  getPopularChoiceFaculty,
} from '@/features/popular-choices/popularChoicesData';

type PopularChoicesDegreeRouteProps = {
  params: Promise<{
    faculty: string;
    degree: string;
  }>;
};

export default async function PopularChoicesDegreeRoute({ params }: PopularChoicesDegreeRouteProps) {
  const { faculty: facultyId, degree: degreeId } = await params;
  const faculty = getPopularChoiceFaculty(facultyId);
  const degree = getPopularChoiceDegree(facultyId, degreeId);

  if (!faculty || !degree) {
    notFound();
  }

  return <PopularChoicesDegreePage faculty={faculty} degree={degree} />;
}
