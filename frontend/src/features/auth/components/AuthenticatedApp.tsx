'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardLayout } from '../../dashboard';
import { getCurrentUser } from '../lib/auth-api';
import { clearToken, getToken } from '../lib/token-storage';

type AuthenticatedAppProps = {
  children: ReactNode;
};

export function AuthenticatedApp({ children }: AuthenticatedAppProps) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const redirectToLogin = useCallback(() => {
    clearToken();
    router.replace('/');
  }, [router]);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      redirectToLogin();
      return;
    }

    getCurrentUser(token)
      .then(() => {
        setIsCheckingAuth(false);
      })
      .catch(() => {
        redirectToLogin();
      });
  }, [redirectToLogin]);

  function handleLogout() {
    redirectToLogin();
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-800 text-gray-300 font-sans">
        Checking saved login...
      </div>
    );
  }

  return <DashboardLayout onLogout={handleLogout}>{children}</DashboardLayout>;
}
