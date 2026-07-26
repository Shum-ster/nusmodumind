import { http, HttpResponse } from "msw";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { NusModuleSearchBar } from "./NusModuleSearchBar";

describe("NusModuleSearchBar", () => {
  it("merges prefix and broad results without duplicates", async () => {
    server.use(
      http.get("http://localhost:3001/nusmodule", ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.has("moduleCodePrefix")) {
          return HttpResponse.json({
            items: [
              {
                moduleCode: "CS1010S",
                moduleCredit: "4",
                title: "Programming Methodology",
              },
            ],
            nextCursor: null,
          });
        }

        return HttpResponse.json({
          items: [
            {
              moduleCode: "CS1010S",
              moduleCredit: "4",
              title: "Programming Methodology",
            },
            {
              moduleCode: "CS1010E",
              moduleCredit: "4",
              title: "Programming Methodology",
            },
          ],
          nextCursor: null,
        });
      }),
    );
    const onModuleClick = vi.fn();
    const user = userEvent.setup();

    render(<NusModuleSearchBar onModuleClick={onModuleClick} />);
    await user.type(screen.getByPlaceholderText("Search modules"), "CS1010");

    const buttons = await screen.findAllByRole("button");
    expect(buttons).toHaveLength(2);

    await user.click(screen.getByText("CS1010E"));
    expect(onModuleClick).toHaveBeenCalledWith(
      expect.objectContaining({ moduleCode: "CS1010E" }),
    );
  });

  it("renders backend search errors", async () => {
    server.use(
      http.get("http://localhost:3001/nusmodule", () =>
        HttpResponse.json({ message: "Search unavailable" }, { status: 503 }),
      ),
    );
    const user = userEvent.setup();

    render(<NusModuleSearchBar onModuleClick={vi.fn()} />);
    await user.type(screen.getByPlaceholderText("Search modules"), "CS");

    expect(await screen.findByText("Search unavailable")).toBeVisible();
  });
});
