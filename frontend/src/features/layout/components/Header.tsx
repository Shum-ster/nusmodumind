'use client';

import { HeaderSearchBar } from './HeaderSearchBar';

export function Header() {
  return (
    <header className="h-14 bg-gray-700 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-5">
        <span className="font-bold text-xl text-orange-600">NUS-ModuMind</span>
      </div>
      <HeaderSearchBar />
    </header>
  );
}
