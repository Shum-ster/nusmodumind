const LOCAL_API_BASE_URL = "http://localhost:3001";
const PRODUCTION_API_BASE_URL = "/api";

export function createApiUrl(path: string) {
  const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const apiBaseUrl =
    configuredApiBaseUrl ||
    (process.env.NODE_ENV === "production"
      ? PRODUCTION_API_BASE_URL
      : LOCAL_API_BASE_URL);
  const normalizedPath = path.replace(/^\/+/, "");

  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return new URL(normalizedPath, `${apiBaseUrl.replace(/\/+$/, "")}/`);
  }

  const relativeBasePath = apiBaseUrl.replace(/^\/+|\/+$/g, "");
  const relativePath = `/${[relativeBasePath, normalizedPath]
    .filter(Boolean)
    .join("/")}`;

  return new URL(relativePath, window.location.origin);
}

type ApiRequestOptions = {
  body?: unknown;
  method?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  token?: string | null;
};

export async function apiRequest<T>(
  path: string,
  { body, method = "GET", query, token }: ApiRequestOptions = {},
) {
  const url = createApiUrl(path);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const responseBody = await readResponse(response);

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error(
        "The submitted images are too large. Choose a smaller cover image or remove it and try again.",
      );
    }

    throw new Error(getErrorMessage(responseBody, "Request failed"));
  }

  return responseBody as T;
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

function getErrorMessage(body: unknown, fallback: string) {
  if (typeof body === "string") {
    const message = body.trim();

    if (
      !message ||
      /<!doctype html|<html[\s>]/i.test(message) ||
      message.length > 500
    ) {
      return "The server returned an unexpected response. Please try again.";
    }

    return message;
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
