import type { PopularChoiceFaculty } from '../popularChoicesData';
import { DegreeButton } from './DegreeButton';

type FacultyDegreeGridProps = {
  faculty: PopularChoiceFaculty;
  onDegreeSelect: (facultyId: string, degreeId: string) => void;
};

export function FacultyDegreeGrid({ faculty, onDegreeSelect }: FacultyDegreeGridProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 text-gray-900 shadow-sm">
      <h2 className="text-lg font-bold text-gray-950">{faculty.title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {faculty.degrees.map((degree) => (
          <DegreeButton
            key={degree.id}
            title={degree.title}
            onClick={() => onDegreeSelect(faculty.id, degree.id)}
          />
        ))}
      </div>
    </section>
  );
}
