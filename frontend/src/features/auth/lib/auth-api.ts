import { apiRequest } from '@/shared/api';
import type { AuthCredentials } from '../types';

type LoginResponse = {
  access_token: string;
};

export type CurrentUserProfile = {
  id: string;
  email: string;
  username: string | null;
  faculty: string | null;
  degree: string | null;
  graduationYear: number | null;
};

export type UpdateCurrentUserProfileBody = {
  username?: string | null;
  graduationYear?: number | null;
  currentPassword?: string;
  newPassword?: string;
};

export async function register(credentials: AuthCredentials) {
  await apiRequest('/auth/register', {
    method: 'POST',
    body: credentials,
  });
}

export async function login(credentials: AuthCredentials) {
  const body = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });

  if (!isLoginResponse(body)) {
    throw new Error('Login response did not include an access_token');
  }

  return body.access_token;
}

export async function getCurrentUser(token: string) {
  return apiRequest<CurrentUserProfile>('/auth/me', { token });
}

export async function updateCurrentUserProfile(
  token: string,
  body: UpdateCurrentUserProfileBody,
) {
  return apiRequest<CurrentUserProfile>('/auth/me', {
    method: 'PATCH',
    token,
    body,
  });
}

function isLoginResponse(body: unknown): body is LoginResponse {
  return (
    !!body &&
    typeof body === 'object' &&
    'access_token' in body &&
    typeof body.access_token === 'string'
  );
}
