type DashboardYearUserInfo = {
  matriculationYear: number;
};

type DashboardYearLayoutProps = {
  yearNumber: number;
  userInfo: DashboardYearUserInfo;
};

export function DashboardYearLayout({
  yearNumber,
  userInfo,
}: DashboardYearLayoutProps) {
  const academicYearStart = userInfo.matriculationYear + yearNumber - 1;
  const metricYear = `AY ${academicYearStart}/${academicYearStart + 1}`;

  return (
    <div className="text-gray-900">
      <h2 className="text-2xl font-bold text-gray-900">Year {yearNumber}</h2>
      <p className="mt-1 text-sm font-medium text-gray-500">{metricYear}</p>
    </div>
  );
}
