import { Eye, Heart } from 'lucide-react';
import Link from 'next/link';
import type { PublicPlan } from '../popular-choices-api';

type DegreePlanCardProps = {
  plan: PublicPlan;
};

export function DegreePlanCard({ plan }: DegreePlanCardProps) {
  const authorLabel = plan.author.username?.trim() || 'NUS student';
  const previewImageUrl = plan.coverImageDataUrl || plan.planImageDataUrl;

  return (
    <Link
      href={`/popular-choices/plans/${encodeURIComponent(plan.id)}`}
      className="flex aspect-[1/1.08] h-full min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:border-orange-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-300"
    >
      <div
        className="relative min-h-0 flex-[1_1_66%] overflow-hidden"
        role="img"
        aria-label={`${plan.title} cover`}
        style={{
          backgroundColor: '#f3f4f6',
          backgroundImage: previewImageUrl ? `url(${previewImageUrl})` : undefined,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        {!previewImageUrl ? (
          <div className="absolute inset-3 grid grid-cols-4 grid-rows-3 gap-1.5">
            <span className="col-span-2 rounded bg-orange-200" />
            <span className="rounded bg-gray-300" />
            <span className="rounded bg-gray-200" />
            <span className="rounded bg-gray-200" />
            <span className="col-span-2 rounded bg-white" />
            <span className="rounded bg-orange-100" />
            <span className="rounded bg-white" />
            <span className="rounded bg-gray-300" />
            <span className="col-span-2 rounded bg-gray-200" />
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-[0_0_34%] flex-col justify-between p-2.5">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-xs font-bold leading-4 text-gray-950">
            {plan.title}
          </h3>
          <p className="mt-1 truncate text-xs font-medium text-gray-500">
            {authorLabel}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-gray-700">
          <span className="inline-flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
            {plan.upvotes.toLocaleString()} likes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-gray-500" />
            {plan.viewCount.toLocaleString()} views
          </span>
        </div>
      </div>
    </Link>
  );
}
