export type AuthCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
};

export type UserProfile = {
  id: string;
  email: string;
  username: string | null;
  faculty: string | null;
  degree: string | null;
  graduationYear: number | null;
};

export type UpdateUserProfileBody = {
  username?: string | null;
  graduationYear?: number | null;
  currentPassword?: string;
  newPassword?: string;
};
