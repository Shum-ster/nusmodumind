'use client';

import { useState } from 'react';
import { Header, Sidebar } from '../layout';
import { DashboardPage } from './DashboardPage';
import { TimetablePage } from '../timetable';
import { CoursesPage } from '../courses';
import { MarketplacePage } from '../marketplace';

type TabName = 'dashboard' | 'timetable' | 'courses' | 'marketplace';

type DashboardLayoutProps = {
  onLogout: () => void;
};

export function DashboardLayout({ onLogout }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'timetable':
        return <TimetablePage />;
      case 'courses':
        return <CoursesPage />;
      case 'marketplace':
        return <MarketplacePage />;
      case 'dashboard':
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-800 text-gray-50 font-sans">
      <Header />
      <div className="flex flex-1">
        <Sidebar activePage={activeTab} onPageChange={setActiveTab} onLogout={onLogout} />
        <main className="flex-1 p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
