'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  getCurrentUser,
  updateCurrentUserProfile,
  type CurrentUserProfile,
  type UpdateCurrentUserProfileBody,
} from '@/features/auth/lib/auth-api';
import { getToken } from '@/features/auth/lib/token-storage';

type UserProfileContextValue = {
  isLoadingProfile: boolean;
  profile: CurrentUserProfile | null;
  profileError: string | null;
  refreshProfile: () => Promise<CurrentUserProfile | null>;
  updateProfile: (
    body: UpdateCurrentUserProfileBody,
  ) => Promise<CurrentUserProfile>;
};

type UserProfileProviderProps = {
  children: ReactNode;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: UserProfileProviderProps) {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setProfile(null);
      setIsLoadingProfile(false);
      setProfileError('Unable to load profile without a saved login.');
      return null;
    }

    setIsLoadingProfile(true);
    setProfileError(null);

    try {
      const nextProfile = await getCurrentUser(token);

      setProfile(nextProfile);
      return nextProfile;
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : 'Unable to load profile.',
      );
      return null;
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (body: UpdateCurrentUserProfileBody) => {
      const token = getToken();

      if (!token) {
        throw new Error('Unable to update profile without a saved login.');
      }

      const updatedProfile = await updateCurrentUserProfile(token, body);

      setProfile(updatedProfile);
      setProfileError(null);

      return updatedProfile;
    },
    [],
  );

  useEffect(() => {
    let ignoreResult = false;

    async function loadInitialProfile() {
      const token = getToken();

      if (!token) {
        if (!ignoreResult) {
          setProfile(null);
          setIsLoadingProfile(false);
          setProfileError('Unable to load profile without a saved login.');
        }

        return;
      }

      try {
        const nextProfile = await getCurrentUser(token);

        if (!ignoreResult) {
          setProfile(nextProfile);
          setProfileError(null);
        }
      } catch (error) {
        if (!ignoreResult) {
          setProfileError(
            error instanceof Error ? error.message : 'Unable to load profile.',
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadInitialProfile();

    return () => {
      ignoreResult = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      isLoadingProfile,
      profile,
      profileError,
      refreshProfile,
      updateProfile,
    }),
    [isLoadingProfile, profile, profileError, refreshProfile, updateProfile],
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);

  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }

  return context;
}
