'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DegreePlanRail } from './components';
import {
  getRankedDegreePlanGroups,
  type PopularChoiceDegree,
  type PopularChoiceFaculty,
} from './popularChoicesData';

type PopularChoicesDegreePageProps = {
  faculty: PopularChoiceFaculty;
  degree: PopularChoiceDegree;
};

export function PopularChoicesDegreePage({ faculty, degree }: PopularChoicesDegreePageProps) {
  const rankedPlans = getRankedDegreePlanGroups(faculty, degree);

  return (
    <div className="grid gap-5 text-gray-900">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <Link
          href="/popular-choices"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Select your degree
        </Link>
        <p className="text-sm font-bold uppercase text-gray-500">{faculty.title}</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-950">{degree.title}</h1>
      </section>

      <DegreePlanRail
        key={`${degree.id}-most-popular`}
        title="Most Popular"
        plans={rankedPlans.mostPopular}
      />
      <DegreePlanRail
        key={`${degree.id}-highest-rated`}
        title="Highest Rated"
        plans={rankedPlans.highestRated}
      />
      <DegreePlanRail
        key={`${degree.id}-up-and-coming`}
        title="Up and Coming"
        plans={rankedPlans.upAndComing}
      />
    </div>
  );
}
