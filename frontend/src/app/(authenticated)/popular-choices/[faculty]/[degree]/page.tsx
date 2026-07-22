import { notFound } from 'next/navigation';

import { PopularChoicesDegreePage } from '@/features/popular-choices';
import { getPopularChoiceSelection } from '@/features/popular-choices/popularChoicesData';

type PopularChoicesDegreeRouteProps = {
  params: Promise<{
    faculty: string;
    degree: string;
  }>;
};

export default async function PopularChoicesDegreeRoute({
  params,
}: PopularChoicesDegreeRouteProps) {
  const { faculty: facultyId, degree: degreeId } = await params;
  const selection = getPopularChoiceSelection(facultyId, degreeId);

  if (!selection) {
    notFound();
  }

  return (
    <PopularChoicesDegreePage
      faculty={selection.faculty}
      degree={selection.degree}
    />
  );
}
