'use client';

import { MarketplaceButton } from './components/MarketplaceButton';

export function MarketplacePage() {
  const degrees = [
    { id: 'comp', title: 'Computing', imageURL: '/assets/images/computing.png' },
    { id: 'biz', title: 'Business', imageURL: '/assets/images/business.png' },
    { id: 'des-eng', title: 'Design and Engineering', imageURL: '/assets/images/designandengineering.png' },
    { id: 'hum-sci', title: 'Humanities and Science', imageURL: '/assets/images/humanitiesandsciences.png' },
    { id: 'med', title: 'Medicine', imageURL: '/assets/images/medicine.png' },
    { id: 'mus', title: 'Music', imageURL: '/assets/images/music.png' },
    { id: 'law', title: 'Law', imageURL: '/assets/images/law.png' }
  ];

  const handleCardClick = (title: string) => {
    alert(`You selected the ${title} marketplace!`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
      <p className="text-gray-500 text-sm mb-6">Select a faculty catalog to explore templates, modules, and study assets.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {degrees.map((degree) => (
          <MarketplaceButton
            key={degree.id}
            title={degree.title}
            imageURL={degree.imageURL}
            onClick={() => handleCardClick(degree.title)}
          />
        ))}
      </div>
    </div>
  );
}
