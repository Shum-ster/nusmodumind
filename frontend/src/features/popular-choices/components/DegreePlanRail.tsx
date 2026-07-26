'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PublicPlanListItem } from '../popular-choices-api';
import { DegreePlanCard } from './DegreePlanCard';

const PAGE_SIZE = 5;
const PRELOAD_SIZE = 10;

type DegreePlanRailProps = {
  title: string;
  plans: PublicPlanListItem[];
};

export function DegreePlanRail({ title, plans }: DegreePlanRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedCount, setLoadedCount] = useState(Math.min(PRELOAD_SIZE, plans.length));

  useEffect(() => {
    railRef.current?.scrollTo({ left: 0 });
  }, [plans]);

  const visiblePlans = plans.slice(
    0,
    Math.min(
      plans.length,
      Math.max(loadedCount, Math.min(PRELOAD_SIZE, plans.length)),
    ),
  );
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex + PAGE_SIZE < plans.length;

  function getCardStride() {
    const rail = railRef.current;
    const firstCard = rail?.querySelector<HTMLElement>('[data-plan-card]');

    if (!rail || !firstCard) {
      return 0;
    }

    const style = window.getComputedStyle(rail);
    const gap = Number.parseFloat(style.columnGap || style.gap || '0');

    return firstCard.offsetWidth + gap;
  }

  function loadThroughIndex(index: number) {
    setLoadedCount((currentCount) => (
      Math.min(plans.length, Math.max(currentCount, index + PRELOAD_SIZE))
    ));
  }

  function scrollToPage(index: number) {
    const nextIndex = Math.max(0, Math.min(index, Math.max(plans.length - PAGE_SIZE, 0)));

    loadThroughIndex(nextIndex);
    setActiveIndex(nextIndex);

    requestAnimationFrame(() => {
      const rail = railRef.current;
      const stride = getCardStride();

      if (!rail || stride === 0) {
        return;
      }

      rail.scrollTo({
        left: stride * nextIndex,
        behavior: 'smooth',
      });
    });
  }

  function handleScroll() {
    const rail = railRef.current;
    const stride = getCardStride();

    if (!rail || stride === 0) {
      return;
    }

    if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - stride) {
      setLoadedCount((currentCount) => Math.min(plans.length, currentCount + PAGE_SIZE));
    }

    const nearestPage = Math.round(rail.scrollLeft / stride / PAGE_SIZE) * PAGE_SIZE;
    setActiveIndex(Math.max(0, Math.min(nearestPage, Math.max(plans.length - PAGE_SIZE, 0))));
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-950">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToPage(activeIndex - PAGE_SIZE)}
            disabled={!hasPrevious}
            aria-label={`Previous ${title} plans`}
            className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 transition-colors hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToPage(activeIndex + PAGE_SIZE)}
            disabled={!hasNext}
            aria-label={`Next ${title} plans`}
            className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 transition-colors hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
      >
        {visiblePlans.map((plan) => (
          <div
            key={plan.id}
            data-plan-card
            className="min-w-0 shrink-0 snap-start"
            style={{ flexBasis: 'calc((100% - 3rem) / 5)' }}
          >
            <DegreePlanCard plan={plan} />
          </div>
        ))}
      </div>
    </section>
  );
}
