'use client';

import { useRouter } from 'next/navigation';

import { MarketplaceButton } from './components/MarketplaceButton';
import { marketplaceFaculties } from './marketplaceData';

export function MarketplacePage() {
  const router = useRouter();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
      <p className="text-gray-500 text-sm mb-6">Select a faculty catalog to explore popular templates of your fellow students!.</p>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {marketplaceFaculties.map((degree) => (
          <MarketplaceButton
            key={degree.id}
            title={degree.title}
            imageURL={degree.imageURL}
            onClick={() => router.push(`/marketplace/${degree.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
