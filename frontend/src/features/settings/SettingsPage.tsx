'use client';

import { KeyRound, Save, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useUserProfile } from '@/features/user';

const minimumGraduationYear = 1900;
const maximumGraduationYear = 2100;

function parseGraduationYear(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedYear = Number(value);

  return Number.isInteger(parsedYear) ? parsedYear : Number.NaN;
}

export function SettingsPage() {
  const { isLoadingProfile, profile, profileError, updateProfile } =
    useUserProfile();
  const [username, setUsername] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileSubmitError, setProfileSubmitError] = useState<string | null>(
    null,
  );
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordSubmitError, setPasswordSubmitError] = useState<string | null>(
    null,
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    let ignoreUpdate = false;

    if (!profile) {
      return () => {
        ignoreUpdate = true;
      };
    }

    queueMicrotask(() => {
      if (ignoreUpdate) {
        return;
      }

      setUsername(profile.username ?? '');
      setGraduationYear(
        profile.graduationYear ? String(profile.graduationYear) : '',
      );
    });

    return () => {
      ignoreUpdate = true;
    };
  }, [profile]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileStatus(null);
    setProfileSubmitError(null);

    const parsedGraduationYear = parseGraduationYear(graduationYear);

    if (
      Number.isNaN(parsedGraduationYear) ||
      (parsedGraduationYear !== null &&
        (parsedGraduationYear < minimumGraduationYear ||
          parsedGraduationYear > maximumGraduationYear))
    ) {
      setProfileSubmitError(
        'Graduation year must be a valid year between 1900 and 2100.',
      );
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateProfile({
        graduationYear: parsedGraduationYear,
        username: username.trim() || null,
      });
      setProfileStatus('Personal information updated.');
    } catch (error) {
      setProfileSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to update personal information.',
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus(null);
    setPasswordSubmitError(null);

    if (!currentPassword || !newPassword) {
      setPasswordSubmitError('Current password and new password are required.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordSubmitError(
        'New password must be at least 6 characters long.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordSubmitError('New password and confirmation must match.');
      return;
    }

    setIsSavingPassword(true);

    try {
      await updateProfile({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus('Password updated.');
    } catch (error) {
      setPasswordSubmitError(
        error instanceof Error ? error.message : 'Unable to update password.',
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="grid gap-5 text-gray-900">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Settings</h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Manage account details used across NUS-ModuMind.
            </p>
          </div>

          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
            {profile?.email ?? 'Account'}
          </div>
        </div>
      </section>

      {profileError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {profileError}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <form
          onSubmit={handleProfileSubmit}
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-gray-950">
              Personal Information
            </h2>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-gray-700">
              Username
              <input
                type="text"
                value={username}
                maxLength={40}
                onChange={(event) => setUsername(event.target.value)}
                disabled={isLoadingProfile || isSavingProfile}
                className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-gray-700">
              Graduation Year
              <input
                type="number"
                value={graduationYear}
                min={minimumGraduationYear}
                max={maximumGraduationYear}
                onChange={(event) => setGraduationYear(event.target.value)}
                disabled={isLoadingProfile || isSavingProfile}
                className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100"
              />
            </label>

            {profileSubmitError ? (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {profileSubmitError}
              </p>
            ) : null}

            {profileStatus ? (
              <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                {profileStatus}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoadingProfile || isSavingProfile}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-wait disabled:bg-gray-300"
            >
              <Save className="h-4 w-4" />
              {isSavingProfile ? 'Saving...' : 'Save Information'}
            </button>
          </div>
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-gray-950">Password</h2>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-gray-700">
              Current Password
              <input
                type="password"
                value={currentPassword}
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={isSavingPassword}
                className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-gray-700">
              New Password
              <input
                type="password"
                value={newPassword}
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={isSavingPassword}
                className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-gray-700">
              Confirm New Password
              <input
                type="password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSavingPassword}
                className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100"
              />
            </label>

            {passwordSubmitError ? (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {passwordSubmitError}
              </p>
            ) : null}

            {passwordStatus ? (
              <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                {passwordStatus}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-wait disabled:bg-gray-300"
            >
              <Save className="h-4 w-4" />
              {isSavingPassword ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
