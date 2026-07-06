'use client';

import { NusModuleSearchBar } from '@/features/courses';
import { useRouter } from 'next/navigation';

export function HeaderSearchBar() {
  const router = useRouter();

  return (
    <NusModuleSearchBar
      onModuleClick={(module) => router.push(`/courses?module=${encodeURIComponent(module.moduleCode)}`)}
    />
  );
}
