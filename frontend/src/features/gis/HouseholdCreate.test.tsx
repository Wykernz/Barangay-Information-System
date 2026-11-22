// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { api } from "../../api";
import { gisApi } from "./api";
import { DatabaseHouseholdDirectory } from "./HouseholdLocation";

vi.mock("../../api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock("./api", () => ({
  gisApi: { householdPage: vi.fn() },
  householdMapUrl: (id: string) => `/gis?household=${id}`,
  householdUrl: (id: string) => `/households/${id}`,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("household creation uses the database API and refreshes the directory", async () => {
  vi.mocked(gisApi.householdPage).mockResolvedValue({
    count: 0,
    results: [],
    next: null,
    previous: null,
  });
  vi.mocked(api.get).mockResolvedValue({ data: {} });
  vi.mocked(api.post).mockResolvedValue({
    data: { id: "household-1", reference: "HH-1" },
  });
  render(
    <MemoryRouter>
      <DatabaseHouseholdDirectory />
    </MemoryRouter>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: /add household/i }),
  );
  fireEvent.change(screen.getByLabelText("Household name or label"), {
    target: { value: "Recorded household" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save household" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("households/", {
      label: "Recorded household",
      is_active: true,
    }),
  );
  expect(api.get).toHaveBeenCalledWith("auth/csrf/");
});
