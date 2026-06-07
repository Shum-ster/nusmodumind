import { LogOut } from 'lucide-react';

type LogoutButtonProps = {
  onLogout: () => void;
};

export function LogoutButton({ onLogout }: LogoutButtonProps) {
  return (
    <button
      onClick={onLogout}
      className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-colors text-gray-500 hover:bg-gray-600"
    >
      <LogOut className="w-4 h-5" />
      Logout
    </button>
  );
}
