'use client';

import { useRouter } from 'next/navigation';

import { FacultyDegreeGrid } from './components';
import { popularChoiceFaculties } from './popularChoicesData';

export function PopularChoicesPage() {
  const router = useRouter();
  const degreeCount = popularChoiceFaculties.reduce(
    (total, faculty) => total + faculty.degrees.length,
    0,
  );

  return (
    <div className="grid gap-5 text-gray-900">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-950">Select your degree</h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          {degreeCount} undergraduate programme options
        </p>
      </section>

      {popularChoiceFaculties.map((faculty) => (
        <FacultyDegreeGrid
          key={faculty.id}
          faculty={faculty}
          onDegreeSelect={(facultyId, degreeId) => {
            router.push(`/popular-choices/${facultyId}/${degreeId}`);
          }}
        />
      ))}
    </div>
  );
}
