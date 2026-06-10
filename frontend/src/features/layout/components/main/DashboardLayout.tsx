'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Header, Sidebar } from '../../';

type TabName = 'dashboard' | 'timetable' | 'courses' | 'marketplace';

type DashboardLayoutProps = {
  children: ReactNode;
  onLogout: () => void;
};

const pageByPath: Record<string, TabName> = {
  '/dashboard': 'dashboard',
  '/timetable': 'timetable',
  '/courses': 'courses',
  '/marketplace': 'marketplace',
};

export function DashboardLayout({ children, onLogout }: DashboardLayoutProps) {
  const pathname = usePathname();
  const activePage = pageByPath[pathname] ?? 'dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-gray-800 text-gray-50 font-sans">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage={activePage} onLogout={onLogout} />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
