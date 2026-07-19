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
  matriculationYear: number | null;
  lifestylePreferences: string | null;
  academicProfileChangeAllowedAt: string | null;
  hasGraduationRequirements: boolean;
};

export type UpdateUserProfileBody = {
  username?: string | null;
  faculty?: string | null;
  degree?: string | null;
  graduationYear?: number | null;
  matriculationYear?: number | null;
  lifestylePreferences?: string | null;
  currentPassword?: string;
  newPassword?: string;
};
