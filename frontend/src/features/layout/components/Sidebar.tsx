import { Calendar, BookOpen, BookSearch, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { LogoutButton } from './LogoutButton';

type SidebarProps = {
  activePage: 'dashboard' | 'timetable' | 'courses' | 'popular-choices';
  onLogout: () => void;
};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'timetable', label: 'Timetable', icon: Calendar, href: '/timetable' },
  { id: 'courses', label: 'My Courses', icon: BookOpen, href: '/courses' },
  { id: 'popular-choices', label: 'Popular Choices', icon: BookSearch, href: '/popular-choices' },
] as const;

export function Sidebar({ activePage, onLogout }: SidebarProps) {
  return (
    <nav className="w-48 bg-gray-800 p-4 flex flex-col gap-2">
      {navItems.map(({ id, label, icon: Icon, href }) => (
        <Link
          key={id}
          href={href}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
            activePage === id
              ? 'bg-gray-300 text-orange-600'
              : 'text-gray-500 hover:bg-gray-600'
          }`}
        >
          <Icon className="w-4 h-5" />
          {label}
        </Link>
      ))}
      <div className="flex-1" />
      <LogoutButton onLogout={onLogout} />
    </nav>
  );
}
