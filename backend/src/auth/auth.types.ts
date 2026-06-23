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
