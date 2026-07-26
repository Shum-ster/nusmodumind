import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/shared/types";
import { SettingsPage } from "./SettingsPage";

const profileMocks = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  useUserProfile: vi.fn(),
}));

vi.mock("@/features/user", () => ({
  useUserProfile: profileMocks.useUserProfile,
}));

const baseProfile: UserProfile = {
  academicProfileChangeAllowedAt: null,
  degree: null,
  email: "student@u.nus.edu",
  faculty: null,
  graduationYear: 2030,
  hasGraduationRequirements: false,
  id: "user-1",
  lifestylePreferences: null,
  matriculationYear: null,
  username: "Student",
};

describe("SettingsPage", () => {
  beforeEach(() => {
    profileMocks.updateProfile.mockReset();
    profileMocks.updateProfile.mockResolvedValue(baseProfile);
    profileMocks.useUserProfile.mockReturnValue({
      isLoadingProfile: false,
      profile: baseProfile,
      profileError: null,
      updateProfile: profileMocks.updateProfile,
    });
  });

  it("requires a faculty before enabling the major selection", async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);
    const faculty = screen.getByLabelText("Faculty");
    const major = screen.getByLabelText("Major");

    expect(major).toBeDisabled();
    await user.selectOptions(faculty, "computing");
    expect(major).toBeEnabled();
    expect(
      screen.getByRole("option", {
        name: "Computer Science",
      }),
    ).toBeInTheDocument();
  });

  it("submits normalized academic and lifestyle information", async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);
    await user.selectOptions(screen.getByLabelText("Faculty"), "computing");
    await user.selectOptions(
      screen.getByLabelText("Major"),
      "Computer Science",
    );
    await user.type(screen.getByLabelText("Matriculation Year"), "2026");
    await user.type(
      screen.getByLabelText("Lifestyle Preferences"),
      "  Avoid 8am classes  ",
    );
    await user.click(
      screen.getByRole("button", { name: "Save Information" }),
    );

    await waitFor(() =>
      expect(profileMocks.updateProfile).toHaveBeenCalledWith({
        degree: "Computer Science",
        faculty: "School of Computing",
        graduationYear: 2030,
        lifestylePreferences: "Avoid 8am classes",
        matriculationYear: 2026,
        username: "Student",
      }),
    );
    expect(
      await screen.findByText("Personal information updated."),
    ).toBeVisible();
  });

  it("rejects invalid years before sending a request", async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);
    const graduationYear = await screen.findByDisplayValue("2030");
    await user.clear(graduationYear);
    await user.type(graduationYear, "1800");
    fireEvent.submit(
      screen.getByRole("button", { name: "Save Information" }).closest(
        "form",
      )!,
    );

    expect(
      await screen.findByText(
        "Graduation year must be a valid year between 1900 and 2100.",
      ),
    ).toBeVisible();
    expect(profileMocks.updateProfile).not.toHaveBeenCalled();
  });

  it("locks academic identity fields during the cooldown", async () => {
    profileMocks.useUserProfile.mockReturnValue({
      isLoadingProfile: false,
      profile: {
        ...baseProfile,
        academicProfileChangeAllowedAt: new Date(
          Date.now() + 60_000,
        ).toISOString(),
        degree: "Computer Science",
        faculty: "School of Computing",
        matriculationYear: 2026,
      },
      profileError: null,
      updateProfile: profileMocks.updateProfile,
    });

    render(<SettingsPage />);

    await screen.findByDisplayValue("2026");
    expect(screen.getByLabelText("Faculty")).toBeDisabled();
    expect(screen.getByLabelText("Major")).toBeDisabled();
    expect(screen.getByLabelText("Matriculation Year")).toBeDisabled();
    expect(
      screen.getByText(/can be changed again/i),
    ).toBeVisible();
  });

  it("preserves an unresolved legacy major until the user replaces it", async () => {
    profileMocks.useUserProfile.mockReturnValue({
      isLoadingProfile: false,
      profile: {
        ...baseProfile,
        degree: "Legacy Computing Programme",
        faculty: "School of Computing",
      },
      profileError: null,
      updateProfile: profileMocks.updateProfile,
    });

    render(<SettingsPage />);

    await screen.findByRole("option", {
      name: "Legacy Computing Programme (current profile value)",
    });
    expect(screen.getByLabelText("Major")).toHaveValue(
      "Legacy Computing Programme",
    );
    expect(
      screen.getByRole("option", {
        name: "Legacy Computing Programme (current profile value)",
      }),
    ).toBeInTheDocument();
  });

  it("validates password confirmation", async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);
    await user.type(screen.getByLabelText("Current Password"), "old-password");
    await user.type(screen.getByLabelText("New Password"), "new-password");
    await user.type(
      screen.getByLabelText("Confirm New Password"),
      "different-password",
    );
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(
      await screen.findByText("New password and confirmation must match."),
    ).toBeVisible();
    expect(profileMocks.updateProfile).not.toHaveBeenCalled();
  });
});
