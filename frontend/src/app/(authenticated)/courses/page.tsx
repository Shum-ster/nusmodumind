import { CoursesPage } from '@/features/courses';

type CoursesRouteProps = {
  searchParams?: Promise<{
    module?: string | string[];
  }>;
};

export default async function CoursesRoute({ searchParams }: CoursesRouteProps) {
  const resolvedSearchParams = await searchParams;
  const moduleParam = resolvedSearchParams?.module;
  const selectedModuleCode = Array.isArray(moduleParam) ? moduleParam[0] : moduleParam;

  return <CoursesPage selectedModuleCode={selectedModuleCode?.toUpperCase() ?? null} />;
}
