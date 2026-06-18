'use client';

import Image from 'next/image';

type MarketplaceButtonProps = {
  title: string;
  imageURL: string;
  onClick: () => void;
};

export function MarketplaceButton({ title, imageURL, onClick }: MarketplaceButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex h-56 w-full flex-col overflow-hidden rounded-lg transition-colors hover:bg-gray-100"
    >
      <div className="relative h-[70%] w-full">
        <Image
          src={imageURL}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
          className="object-cover"
        />
      </div>
      <div className="flex h-[30%] w-full items-center justify-center bg-gray-900 px-3">
        <p className="text-center text-sm font-medium text-white">{title}</p>
      </div>
    </button>
  );
}
