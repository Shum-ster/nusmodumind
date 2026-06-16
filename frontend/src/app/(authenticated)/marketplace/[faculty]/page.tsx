import { notFound } from 'next/navigation';

import { MarketplaceDegreePage } from '@/features/marketplace';
import { getMarketplaceFaculty } from '@/features/marketplace/marketplaceData';

type MarketplaceFacultyRouteProps = {
  params: Promise<{
    faculty: string;
  }>;
};

export default async function MarketplaceFacultyRoute({ params }: MarketplaceFacultyRouteProps) {
  const { faculty: facultyId } = await params;
  const faculty = getMarketplaceFaculty(facultyId);

  if (!faculty) {
    notFound();
  }

  return <MarketplaceDegreePage faculty={faculty} />;
}
