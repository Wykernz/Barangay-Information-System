// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../../api";
import { HousingUnitDetail, HousingUnitDirectory } from "./HousingRegistry";

vi.mock("../../api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("directory reads database units and creates with CSRF before refreshing", async () => {
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === "housing-units/")
      return {
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: "unit-1",
              reference: "HU-1",
              label: "Actual home",
              house_number: "12-A",
              address_text: "Payahan",
              is_active: true,
            },
          ],
        },
      } as never;
    return {
      data: { housing_units: 1, occupied_units: 1, mapped_units: 1 },
    } as never;
  });
  vi.mocked(api.post).mockResolvedValue({ data: { id: "unit-2" } });
  render(
    <MemoryRouter>
      <HousingUnitDirectory />
    </MemoryRouter>,
  );
  expect(await screen.findByText("HU-1")).toBeTruthy();
  expect(screen.getByText("12-A")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /add housing unit/i }));
  fireEvent.change(screen.getByLabelText("Housing unit label"), {
    target: { value: "New home" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save housing unit" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("housing-units/", {
      label: "New home",
      house_number: "",
      address_text: "",
    }),
  );
  expect(api.get).toHaveBeenCalledWith("auth/csrf/");
});

test("unit detail shows effective occupancy and links to the household and map", async () => {
  const id = "unit-id";
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === `housing-units/${id}/`)
      return {
        data: {
          id,
          reference: "HU-42",
          label: "Recorded home",
          house_number: "42",
          address_text: "Payahan",
          is_active: true,
        },
      } as never;
    if (url === "household-occupancies/")
      return {
        data: {
          results: [
            {
              id: "occ-1",
              household: "house-id",
              housing_unit: id,
              valid_from: "2020-01-01",
              valid_to: null,
            },
          ],
          next: null,
        },
      } as never;
    if (url === "households/")
      return {
        data: {
          results: [
            {
              id: "house-id",
              reference: "HH-1",
              label: "Sample household",
              is_active: true,
            },
          ],
          next: null,
        },
      } as never;
    if (url === "gis/households/")
      return {
        data: {
          results: [
            {
              id: "house-id",
              location: {
                id: "loc-1",
                latitude: 12,
                longitude: 124,
                source: "staff",
                accuracy_m: null,
                verification_status: "verified",
              },
            },
          ],
          next: null,
        },
      } as never;
    throw new Error(`Unexpected URL: ${url}`);
  });
  render(
    <MemoryRouter initialEntries={[`/housing/${id}`]}>
      <Routes>
        <Route path="/housing/:id" element={<HousingUnitDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Sample household")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /view household/i }).getAttribute("href"),
  ).toBe("/households/house-id");
  expect(
    screen.getByRole("link", { name: /view on map/i }).getAttribute("href"),
  ).toBe("/gis?household=house-id");
});
