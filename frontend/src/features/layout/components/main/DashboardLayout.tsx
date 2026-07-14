'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardModuleSelectionProvider } from '@/features/dashboard/DashboardModuleSelectionContext';
import { UserProfileProvider } from '@/features/user';
import { Header, Sidebar } from '../../';

type TabName =
  | 'dashboard'
  | 'timetable'
  | 'courses'
  | 'popular-choices'
  | 'settings';

type DashboardLayoutProps = {
  children: ReactNode;
  onLogout: () => void;
};

const pageByPath: Record<string, TabName> = {
  '/dashboard': 'dashboard',
  '/timetable': 'timetable',
  '/courses': 'courses',
  '/popular-choices': 'popular-choices',
  '/settings': 'settings',
};

export function DashboardLayout({ children, onLogout }: DashboardLayoutProps) {
  const pathname = usePathname();
  const activePage = pathname.startsWith('/popular-choices/')
    ? 'popular-choices'
    : (pageByPath[pathname] ?? 'dashboard');

  return (
    <UserProfileProvider>
      <DashboardModuleSelectionProvider>
        <div className="min-h-screen flex flex-col bg-gray-800 text-gray-50 font-sans">
          <Header />
          <div className="flex flex-1">
            <Sidebar activePage={activePage} onLogout={onLogout} />
            <main className="flex-1 p-8">{children}</main>
          </div>
        </div>
      </DashboardModuleSelectionProvider>
    </UserProfileProvider>
  );
}
