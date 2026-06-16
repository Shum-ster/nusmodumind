import type { ReactNode } from 'react';
import { AuthenticatedApp } from '@/features/auth/components';

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return <AuthenticatedApp>{children}</AuthenticatedApp>;
}
