import { describe, expect, it } from "vitest";
import { readImageFileAsDataUrl } from "./image-file";

describe("readImageFileAsDataUrl", () => {
  it("reads supported image files", async () => {
    const file = new File(["image"], "plan.png", { type: "image/png" });

    await expect(readImageFileAsDataUrl(file)).resolves.toMatch(
      /^data:image\/png;base64,/,
    );
  });

  it("rejects non-image files", async () => {
    const file = new File(["text"], "plan.txt", { type: "text/plain" });

    await expect(readImageFileAsDataUrl(file)).rejects.toThrow(
      "Choose an image file",
    );
  });

  it("rejects images larger than seven megabytes", async () => {
    const file = new File([new Uint8Array(7 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    });

    await expect(readImageFileAsDataUrl(file)).rejects.toThrow(
      "smaller than 7 MB",
    );
  });
});
