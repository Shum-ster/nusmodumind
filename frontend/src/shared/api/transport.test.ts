import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/server";
import { apiRequest, createApiUrl } from "./transport";

describe("API transport", () => {
  it("creates URLs using the configured API origin", () => {
    expect(createApiUrl("/auth/me").toString()).toBe(
      "http://localhost:3001/auth/me",
    );
  });

  it("serializes query values and omits empty values", async () => {
    server.use(
      http.get("http://localhost:3001/nusmodule", ({ request }) => {
        const url = new URL(request.url);

        expect(url.searchParams.get("search")).toBe("algorithms");
        expect(url.searchParams.get("limit")).toBe("20");
        expect(url.searchParams.has("cursor")).toBe(false);
        return HttpResponse.json({ items: [] });
      }),
    );

    await expect(
      apiRequest("/nusmodule", {
        query: { cursor: null, limit: 20, search: "algorithms" },
      }),
    ).resolves.toEqual({ items: [] });
  });

  it("sends JSON and bearer authentication", async () => {
    server.use(
      http.patch("http://localhost:3001/auth/me", async ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer test-token");
        expect(request.headers.get("content-type")).toBe("application/json");
        expect(await request.json()).toEqual({ username: "Xian You" });
        return HttpResponse.json({ id: "user-1", username: "Xian You" });
      }),
    );

    await expect(
      apiRequest("/auth/me", {
        body: { username: "Xian You" },
        method: "PATCH",
        token: "test-token",
      }),
    ).resolves.toMatchObject({ username: "Xian You" });
  });

  it("returns null for an empty successful response", async () => {
    server.use(
      http.delete(
        "http://localhost:3001/planned-modules/module-1",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(
      apiRequest("/planned-modules/module-1", { method: "DELETE" }),
    ).resolves.toBeNull();
  });

  it("surfaces API validation messages", async () => {
    server.use(
      http.post("http://localhost:3001/auth/register", () =>
        HttpResponse.json(
          { message: ["email must be an email", "password is too short"] },
          { status: 400 },
        ),
      ),
    );

    await expect(
      apiRequest("/auth/register", {
        body: { email: "bad", password: "123" },
        method: "POST",
      }),
    ).rejects.toThrow("email must be an email, password is too short");
  });

  it("uses the dedicated large-image error for HTTP 413", async () => {
    server.use(
      http.post(
        "http://localhost:3001/public-plans",
        () => new HttpResponse(null, { status: 413 }),
      ),
    );

    await expect(
      apiRequest("/public-plans", { body: {}, method: "POST" }),
    ).rejects.toThrow("submitted images are too large");
  });
});
