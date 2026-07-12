import { Heart } from 'lucide-react';
import type { PopularChoicePlan } from '../popularChoicesData';

type DegreePlanCardProps = {
  plan: PopularChoicePlan;
};

export function DegreePlanCard({ plan }: DegreePlanCardProps) {
  const [startColor, endColor] = plan.coverPalette;

  return (
    <article className="flex aspect-[1/1.08] h-full min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div
        className="relative min-h-0 flex-[1_1_66%] overflow-hidden"
        role="img"
        aria-label={`${plan.title} cover`}
        style={{
          backgroundImage: plan.coverImageUrl
            ? `linear-gradient(rgba(17, 24, 39, 0.08), rgba(17, 24, 39, 0.08)), url(${plan.coverImageUrl})`
            : `linear-gradient(135deg, ${startColor}, ${endColor})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        {!plan.coverImageUrl ? (
          <div className="absolute inset-3 grid grid-cols-4 grid-rows-3 gap-1.5 opacity-90">
            <span className="col-span-2 rounded bg-white/85" />
            <span className="rounded bg-white/50" />
            <span className="rounded bg-white/70" />
            <span className="rounded bg-white/45" />
            <span className="col-span-2 rounded bg-white/75" />
            <span className="rounded bg-white/55" />
            <span className="rounded bg-white/80" />
            <span className="rounded bg-white/45" />
            <span className="col-span-2 rounded bg-white/65" />
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-[0_0_34%] flex-col justify-between p-2.5">
        <h3 className="line-clamp-2 text-xs font-bold leading-4 text-gray-950">{plan.title}</h3>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-gray-700">
          <Heart className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
          <span>{plan.likes.toLocaleString()} likes</span>
        </div>
      </div>
    </article>
  );
}
