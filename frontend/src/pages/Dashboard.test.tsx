// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { api } from "../api";

vi.mock("../api", () => ({ api: { get: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("overview uses database aggregates and labels unsupported statistics", async () => {
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === "audit/events/") return { data: { results: [] } } as never;
    return {
      data: {
        as_of: "2026-11-22",
        registered_persons: 12,
        verified_residents: 7,
        active_households: 4,
        housing_units: 5,
        occupied_units: 3,
        mapped_units: null,
        age_groups: { "0-14": 2, "60+": 1 },
        residency: {
          Resident: 8,
          "Non-resident": 2,
          "Pending classification": 2,
        },
        sex: { Male: 5, Female: 6, "Other or not recorded": 1 },
      },
    } as never;
  });
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(
    (await screen.findByText("12")).closest("a")?.getAttribute("href"),
  ).toBe("/residents");
  expect(screen.getByText("7").closest("a")?.getAttribute("href")).toBe(
    "/residents",
  );
  expect(screen.getByText("Database family registry pending")).toBeTruthy();
  expect(screen.getByText("Verified program data pending")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /View housing map/ }).getAttribute("href"),
  ).toBe("/gis");
  expect(api.get).toHaveBeenCalledWith("overview/");
});
