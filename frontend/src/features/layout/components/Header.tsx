'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDashboardModuleSelection } from '@/features/dashboard/DashboardModuleSelectionContext';
import { searchMockNusModules } from '@/features/dashboard/mockModules';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const { addSelectedModule, isModuleSelected } = useDashboardModuleSelection();
  const searchResults = useMemo(() => searchMockNusModules(searchQuery), [searchQuery]);
  const showResults = searchQuery.trim().length > 0;

  return (
    <header className="h-14 bg-gray-700 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-5">
        <span className="font-bold text-xl text-orange-600">NUS-ModuMind</span>
      </div>
      <div className="relative w-64">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-100" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search modules"
          className="w-full rounded-lg border border-gray-600 bg-gray-700 py-1.5 pl-9 pr-4 text-sm text-gray-50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />

        {showResults && (
          <div className="absolute right-0 mt-2 max-h-96 w-96 overflow-y-auto rounded-lg border border-gray-200 bg-white py-2 text-gray-900 shadow-xl">
            {searchResults.length > 0 ? (
              searchResults.map((module) => (
                <button
                  key={module.code}
                  type="button"
                  onClick={() => addSelectedModule(module)}
                  className={`grid w-full grid-cols-[5.5rem_1fr_auto] items-center gap-3 px-4 py-2 text-left text-sm hover:bg-orange-50 ${
                    isModuleSelected(module.code) ? 'bg-green-100 hover:bg-green-100' : ''
                  }`}
                >
                  <span className="font-bold text-orange-600">{module.code}</span>
                  <span className="truncate font-medium">{module.title}</span>
                  <span className="text-xs text-gray-500">{module.credits} MC</span>
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-gray-500">No modules found.</p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
