import { DashboardLayout } from '../../dashboard';

type MainAppPageProps = {
  status: string;
  onLogout: () => void;
};

export function MainAppPage({ status, onLogout }: MainAppPageProps) {
  return <DashboardLayout onLogout={onLogout} />;
}
