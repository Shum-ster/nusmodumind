import { DashboardLayout, DashboardPage } from '../../dashboard';

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
