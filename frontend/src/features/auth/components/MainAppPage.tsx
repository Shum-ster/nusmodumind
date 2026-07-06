import { DashboardPage } from '@/features/dashboard';
import { DashboardLayout } from '@/features/layout';

type MainAppPageProps = {
  status: string;
  onLogout: () => void;
};

export function MainAppPage({ onLogout }: MainAppPageProps) {
  return (
    <DashboardLayout onLogout={onLogout}>
      <DashboardPage />
    </DashboardLayout>
  );
}
