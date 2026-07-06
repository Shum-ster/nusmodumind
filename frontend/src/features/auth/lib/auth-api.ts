import { apiRequest } from "@/shared/api";
import type { AuthCredentials } from "../types";

type LoginResponse = {
  access_token: string;
};

export async function register(credentials: AuthCredentials) {
  await apiRequest("/auth/register", {
    method: "POST",
    body: credentials,
  });
}

export async function login(credentials: AuthCredentials) {
  const body = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: credentials,
  });

  if (!isLoginResponse(body)) {
    throw new Error("Login response did not include an access_token");
  }

  return body.access_token;
}

export async function getCurrentUser(token: string) {
  return apiRequest("/auth/me", { token });
}

function isLoginResponse(body: unknown): body is LoginResponse {
  return (
    !!body &&
    typeof body === "object" &&
    "access_token" in body &&
    typeof body.access_token === "string"
  );
}
