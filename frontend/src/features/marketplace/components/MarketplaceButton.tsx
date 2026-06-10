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
      className="flex flex-col items-center gap-3 p-4 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <Image
        src={imageURL}
        alt={title}
        width={64}
        height={64}
        className="w-16 h-16 object-cover rounded-lg"
      />
      <p className="text-sm font-medium text-gray-700 text-center">{title}</p>
    </button>
  );
}
