'use client';

import { MarketplaceButton } from './components/MarketplaceButton';
import type { MarketplaceFaculty } from './marketplaceData';

type MarketplaceDegreePageProps = {
  faculty: MarketplaceFaculty;
};

export function MarketplaceDegreePage({ faculty }: MarketplaceDegreePageProps) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">{faculty.title}</h1>
      <p className="mb-6 text-sm text-gray-500">Select your degree.</p>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {faculty.degrees.map((degree) => (
          <MarketplaceButton
            key={degree.id}
            title={degree.title}
            imageURL={degree.imageURL}
            onClick={() => alert(`You have clicked for ${degree.title} degree`)}
          />
        ))}
      </div>
    </div>
  );
}
