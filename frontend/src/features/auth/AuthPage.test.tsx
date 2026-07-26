import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { AuthPage } from "./AuthPage";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("AuthPage", () => {
  beforeEach(() => replace.mockReset());

  it("registers a new account and leaves the user on login", async () => {
    server.use(
      http.post("http://localhost:3001/auth/register", async ({ request }) => {
        expect(await request.json()).toEqual({
          email: "student@u.nus.edu",
          password: "password",
        });
        return HttpResponse.json(
          { email: "student@u.nus.edu", id: "user-1" },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();

    render(<AuthPage />);
    await screen.findByText("Not logged in");
    await user.type(screen.getByLabelText("Email"), "student@u.nus.edu");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Registered. You can log in now.")).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });

  it("logs in, stores the JWT, validates the user, and navigates", async () => {
    server.use(
      http.post("http://localhost:3001/auth/login", () =>
        HttpResponse.json({ access_token: "signed-token" }),
      ),
      http.get("http://localhost:3001/auth/me", ({ request }) => {
        expect(request.headers.get("authorization")).toBe(
          "Bearer signed-token",
        );
        return HttpResponse.json({
          academicProfileChangeAllowedAt: null,
          degree: null,
          email: "student@u.nus.edu",
          faculty: null,
          graduationYear: null,
          id: "user-1",
          lifestylePreferences: null,
          matriculationYear: null,
          username: null,
        });
      }),
    );
    const user = userEvent.setup();

    render(<AuthPage />);
    await screen.findByText("Not logged in");
    await user.type(screen.getByLabelText("Email"), "student@u.nus.edu");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(window.localStorage.getItem("access_token")).toBe("signed-token");
  });

  it("clears an invalid saved session", async () => {
    window.localStorage.setItem("access_token", "expired-token");
    server.use(
      http.get("http://localhost:3001/auth/me", () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 }),
      ),
    );

    render(<AuthPage />);

    expect(await screen.findByText("Unauthorized")).toBeVisible();
    expect(window.localStorage.getItem("access_token")).toBeNull();
  });
});
