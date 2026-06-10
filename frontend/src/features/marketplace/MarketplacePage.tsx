'use client';

import { MarketplaceButton } from './components/MarketplaceButton';

export function MarketplacePage() {
  const degrees = [
    { id: 'comp', title: 'Computing', imageURL: '/assets/images/faculty/computing.png' },
    { id: 'biz', title: 'Business', imageURL: '/assets/images/faculty/business.png' },
    { id: 'des-eng', title: 'Design and Engineering', imageURL: '/assets/images/faculty/designandengineering.png' },
    { id: 'hum-sci', title: 'Humanities and Science', imageURL: '/assets/images/faculty/humanitiesandsciences.png' },
    { id: 'med', title: 'Medicine', imageURL: '/assets/images/faculty/medicine.png' },
    { id: 'mus', title: 'Music', imageURL: '/assets/images/faculty/music.png' },
    { id: 'law', title: 'Law', imageURL: '/assets/images/faculty/law.png' },
    { id: 'nurs', title: 'Nursing', imageURL: '/assets/images/faculty/nursing.png'},
    { id: 'nusc', title: 'NUS College', imageURL: '/assets/images/faculty/nuscollege.png'},
    { id: 'phar', title: 'Pharmacy', imageURL: '/assets/images/faculty/pharmacy.png'}
  ];

  const handleCardClick = (title: string) => {
    alert(`You selected the ${title} marketplace!`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Marketplace</h1>
      <p className="text-gray-500 text-sm mb-6">Select a faculty catalog to explore popular templates of your fellow students!.</p>

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
