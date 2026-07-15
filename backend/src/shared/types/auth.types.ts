export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
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
