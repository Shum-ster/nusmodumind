import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { saveToken } from "@/features/auth/lib/token-storage";
import { server } from "@/test/server";
import { UserProfileProvider, useUserProfile } from "./UserProfileContext";

function ProfileConsumer() {
  const { isLoadingProfile, profile, profileError, updateProfile } =
    useUserProfile();

  return (
    <div>
      <p>{isLoadingProfile ? "Loading" : "Ready"}</p>
      <p>{profile?.username ?? "No profile"}</p>
      <p>{profileError ?? "No error"}</p>
      <button
        type="button"
        onClick={() => void updateProfile({ username: "Updated" })}
      >
        Update
      </button>
    </div>
  );
}

describe("UserProfileProvider", () => {
  it("reports a missing saved login", async () => {
    render(
      <UserProfileProvider>
        <ProfileConsumer />
      </UserProfileProvider>,
    );

    expect(
      await screen.findByText("Unable to load profile without a saved login."),
    ).toBeVisible();
    expect(screen.getByText("Ready")).toBeVisible();
  });

  it("loads and updates the current profile", async () => {
    saveToken("jwt");
    server.use(
      http.get("http://localhost:3001/auth/me", () =>
        HttpResponse.json({
          academicProfileChangeAllowedAt: null,
          degree: null,
          email: "student@u.nus.edu",
          faculty: null,
          graduationYear: null,
          hasGraduationRequirements: false,
          id: "user-1",
          lifestylePreferences: null,
          matriculationYear: null,
          username: "Initial",
        }),
      ),
      http.patch(
        "http://localhost:3001/auth/me",
        async ({ request }) => {
          expect(request.headers.get("authorization")).toBe("Bearer jwt");
          expect(await request.json()).toEqual({ username: "Updated" });
          return HttpResponse.json({
            academicProfileChangeAllowedAt: null,
            degree: null,
            email: "student@u.nus.edu",
            faculty: null,
            graduationYear: null,
            hasGraduationRequirements: false,
            id: "user-1",
            lifestylePreferences: null,
            matriculationYear: null,
            username: "Updated",
          });
        },
      ),
    );
    const user = userEvent.setup();

    render(
      <UserProfileProvider>
        <ProfileConsumer />
      </UserProfileProvider>,
    );

    expect(await screen.findByText("Initial")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(screen.getByText("Updated")).toBeVisible());
  });
});
