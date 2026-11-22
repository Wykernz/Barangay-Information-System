// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api";
import Reports from "./Reports";

vi.mock("../api", () => ({ api: { get: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("reports use database aggregates and explain unavailable sources", async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: {
      as_of: "2026-11-22",
      registered_persons: 10,
      verified_residents: 6,
      active_households: 4,
      housing_units: 3,
      occupied_units: 2,
      mapped_units: null,
    },
  });
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByText("Registered persons")).toBeTruthy();
  expect(
    screen.getByText(
      /Family, 4Ps, purok, and detailed exports are not available/,
    ),
  ).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith("overview/");
});
