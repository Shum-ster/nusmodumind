import { CourseDetail } from '@/features/courses';

type CourseDetailRouteProps = {
  params: Promise<{
    moduleCode: string;
  }>;
};

export default async function CourseDetailRoute({
  params,
}: CourseDetailRouteProps) {
  const { moduleCode } = await params;

  return (
    <CourseDetail
      selectedModuleCode={decodeURIComponent(moduleCode).toUpperCase()}
    />
  );
}
