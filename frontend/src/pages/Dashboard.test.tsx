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
        age_groups: {
          "Early Childhood (0-5)": 2,
          "Senior Citizens (60-74)": 1,
          "75+ (classification pending)": 0,
        },
        household_sizes: { "0": 1, "1": 1, "2-3": 2, "4-5": 0, "6+": 0 },
        water_sources: { "Level I": 1, "Level III": 2, "Not recorded": 1 },
        sanitation: {
          "Flush-type toilet with septic tank": 2,
          "None": 0,
          "Not recorded": 2,
        },
        data_quality: {
          "Residents missing birthdate": 1,
          "Residents awaiting verification": 5,
          "Residents missing residency classification": 2,
          "Households missing water source": 1,
          "Households missing sanitation": 2,
          "Housing units without current occupancy": 2,
        },
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
    screen.getByRole("region", { name: "Household-size distribution" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("region", { name: "Missing and unverified data" }),
  ).toBeTruthy();
  expect(screen.getByText("75+ (classification pending)")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /View housing map/ }).getAttribute("href"),
  ).toBe("/gis");
  expect(api.get).toHaveBeenCalledWith("overview/");
});

test("legacy overview responses do not crash when newer analytics are absent", async () => {
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === "audit/events/") return { data: { results: [] } } as never;
    return {
      data: {
        as_of: "2026-11-22",
        registered_persons: 2,
        verified_residents: 1,
        active_households: 1,
        housing_units: 1,
        occupied_units: 0,
        mapped_units: null,
        age_groups: { "0-14": 1, "Not recorded": 1 },
        residency: { Resident: 1, "Pending classification": 1 },
        sex: { Female: 1, "Other or not recorded": 1 },
      },
    } as never;
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect((await screen.findAllByText("2")).length).toBeGreaterThan(0);
  expect(
    screen.getAllByText(
      "This analytics group is unavailable from the current backend version.",
    ),
  ).toHaveLength(4);
});
