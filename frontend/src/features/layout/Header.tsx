import { Search } from 'lucide-react';

export function Header() {
  return (
    <header className="h-14 bg-gray-700 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-5">
        <span className="font-bold text-xl text-orange-600">NUS-ModuMind</span>
      </div>
      <div className="relative w-64">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-100" />
        <input
          type="text"
          placeholder="AY2025/26, Special Term I, Week 4"
          className="w-full pl-9 pr-4 py-1.5 bg-gray-700 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>
    </header>
  );
}
