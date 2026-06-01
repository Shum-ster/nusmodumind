import type { AuthCredentials } from "../types";

const API_BASE_URL = "http://localhost:3001";

type LoginResponse = {
  access_token: string;
};

export async function register(credentials: AuthCredentials) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
  const body = await readResponse(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Registration failed"));
  }
}

export async function login(credentials: AuthCredentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
  const body = await readResponse(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "Login failed"));
  }

  if (!isLoginResponse(body)) {
    throw new Error("Login response did not include an access_token");
  }

  return body.access_token;
}

export async function getCurrentUser(token: string) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await readResponse(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(body, "JWT check failed"));
  }

  return body;
}

async function readResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// Concatenates error messages
function getErrorMessage(body: unknown, fallback: string) {
  if (typeof body === "string") {
    return body;
  }

  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}

// 
function isLoginResponse(body: unknown): body is LoginResponse {
  return (
    !!body &&
    typeof body === "object" &&
    "access_token" in body &&
    typeof body.access_token === "string"
  );
}
