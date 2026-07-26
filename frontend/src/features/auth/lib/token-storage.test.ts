import { describe, expect, it } from "vitest";
import { clearToken, getToken, saveToken } from "./token-storage";

describe("token storage", () => {
  it("stores, reads, and clears the access token", () => {
    expect(getToken()).toBeNull();

    saveToken("signed-jwt");
    expect(getToken()).toBe("signed-jwt");

    clearToken();
    expect(getToken()).toBeNull();
  });
});
