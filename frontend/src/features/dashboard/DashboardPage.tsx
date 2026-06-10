import { DashboardYearLayout } from './components';
import { mockNusModules } from './mockModules';

const mockUserInfo = {
  matriculationYear: 2026,
};

export function DashboardPage() {
  const semesterOneModules = mockNusModules.slice(0, 10);
  const semesterTwoModules = mockNusModules.slice(10, 20);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-300">Temporary hardcoded NUS modules.</p>
      </div>

      <DashboardYearLayout
        yearNumber={1}
        userInfo={mockUserInfo}
        semesters={[
          { semesterName: 'Semester 1', modules: semesterOneModules },
          { semesterName: 'Semester 2', modules: semesterTwoModules },
        ]}
      />
    </div>
  );
}
