import { PopularChoicesPlanDetailPage } from '@/features/popular-choices';

type PopularChoicesPlanRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PopularChoicesPlanRoute({
  params,
}: PopularChoicesPlanRouteProps) {
  const { id } = await params;

  return <PopularChoicesPlanDetailPage planId={id} />;
}
