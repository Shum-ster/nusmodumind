import { LayoutDashboard, Calendar, BookOpen, BookSearch } from 'lucide-react';
import { LogoutButton } from './LogoutButton';

type SidebarProps = {
  activePage: 'dashboard' | 'timetable' | 'courses' | 'marketplace';
  onPageChange: (page: 'dashboard' | 'timetable' | 'courses' | 'marketplace') => void;
  onLogout: () => void;
};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'timetable', label: 'Timetable', icon: Calendar },
  { id: 'courses', label: 'My Courses', icon: BookOpen },
  { id: 'marketplace', label: 'Marketplace', icon: BookSearch },
];

export function Sidebar({ activePage, onPageChange, onLogout }: SidebarProps) {
  return (
    <nav className="w-48 bg-gray-800 p-4 flex flex-col gap-2">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onPageChange(id as any)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
            activePage === id
              ? 'bg-gray-300 text-orange-600'
              : 'text-gray-500 hover:bg-gray-600'
          }`}
        >
          <Icon className="w-4 h-5" />
          {label}
        </button>
      ))}
      <div className="flex-1" />
      <LogoutButton onLogout={onLogout} />
    </nav>
  );
}
