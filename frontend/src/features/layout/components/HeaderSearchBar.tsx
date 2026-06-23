'use client';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { NusModuleListItem } from '@/features/courses/courses-api';
import { useDashboardModuleSelection } from '@/features/dashboard/DashboardModuleSelectionContext';
import { setDashboardModuleDragData } from '@/features/dashboard/dashboard-drag';
import type { DashboardModule } from '@/features/dashboard/types';
import { searchHeaderModules } from '../layout-api';

const maxSearchResults = 8;

function getEstimatedWorkload(workload: unknown) {
  if (!Array.isArray(workload)) {
    return 0;
  }

  return workload.reduce((total, workloadPart) => {
    const numericWorkloadPart = typeof workloadPart === 'number'
      ? workloadPart
      : Number(workloadPart);

    return Number.isFinite(numericWorkloadPart) ? total + numericWorkloadPart : total;
  }, 0);
}

function toDashboardModule(module: NusModuleListItem): DashboardModule {
  return {
    code: module.moduleCode,
    title: module.title,
    faculty: module.faculty,
    credits: Number(module.moduleCredit) || 0,
    estimatedWorkload: getEstimatedWorkload(module.workload),
    prerequisite: module.prerequisite,
    semesterData: module.semesterData,
  };
}

function mergeSearchResults(prefixResults: NusModuleListItem[], broadResults: NusModuleListItem[]) {
  const seenModuleCodes = new Set<string>();

  return [...prefixResults, ...broadResults].filter((module) => {
    if (seenModuleCodes.has(module.moduleCode)) {
      return false;
    }

    seenModuleCodes.add(module.moduleCode);
    return true;
  }).slice(0, maxSearchResults);
}

export function HeaderSearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NusModuleListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { addSelectedModule, isModuleInPlan } = useDashboardModuleSelection();
  const normalizedQuery = searchQuery.trim();
  const showResults = normalizedQuery.length > 0;

  useEffect(() => {
    if (!normalizedQuery) {
      return;
    }

    let ignoreResult = false;

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const prefixResponse = await searchHeaderModules({
          moduleCodePrefix: normalizedQuery,
          limit: maxSearchResults,
        });
        const remainingResultCount = maxSearchResults - prefixResponse.items.length;
        const broadResponse = remainingResultCount > 0
          ? await searchHeaderModules({
              search: normalizedQuery,
              limit: maxSearchResults,
            })
          : { items: [], nextCursor: null };

        if (!ignoreResult) {
          setSearchResults(mergeSearchResults(prefixResponse.items, broadResponse.items));
        }
      } catch (error) {
        if (!ignoreResult) {
          setSearchResults([]);
          setSearchError(error instanceof Error ? error.message : 'Unable to search modules.');
        }
      } finally {
        if (!ignoreResult) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      ignoreResult = true;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedQuery]);

  return (
    <div className="relative w-64">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-100" />
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => {
          const nextSearchQuery = event.target.value;

          setSearchQuery(nextSearchQuery);
          setSearchError(null);

          if (nextSearchQuery.trim()) {
            setIsSearching(true);
          } else {
            setSearchResults([]);
            setIsSearching(false);
          }
        }}
        placeholder="Search modules"
        className="w-full rounded-lg border border-gray-600 bg-gray-700 py-1.5 pl-9 pr-4 text-sm text-gray-50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-300"
      />

      {showResults && (
        <div className="absolute right-0 mt-2 max-h-96 w-96 overflow-y-auto rounded-lg border border-gray-200 bg-white py-2 text-gray-900 shadow-xl">
          {isSearching ? (
            <p className="px-4 py-3 text-sm text-gray-500">Searching modules...</p>
          ) : searchError ? (
            <p className="px-4 py-3 text-sm text-red-600">{searchError}</p>
          ) : searchResults.length > 0 ? (
            searchResults.map((module) => {
              const dashboardModule = toDashboardModule(module);
              const isPlanned = isModuleInPlan(module.moduleCode);

              return (
                <button
                  key={module.moduleCode}
                  type="button"
                  draggable
                  onClick={() => addSelectedModule(dashboardModule)}
                  onDragStart={(event) => setDashboardModuleDragData(event, dashboardModule)}
                  className={`grid w-full cursor-grab grid-cols-[5.5rem_1fr_auto] items-center gap-3 px-4 py-2 text-left text-sm active:cursor-grabbing ${
                    isPlanned ? 'bg-green-100 hover:bg-green-100' : 'hover:bg-orange-50'
                  }`}
                >
                  <span className="font-bold text-orange-600">{module.moduleCode}</span>
                  <span className="truncate font-medium">{module.title}</span>
                  <span className="text-xs text-gray-500">{module.moduleCredit} MC</span>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-3 text-sm text-gray-500">No modules found.</p>
          )}
        </div>
      )}
    </div>
  );
}
