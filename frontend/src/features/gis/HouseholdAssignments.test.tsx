// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { api } from "../../api";
import HouseholdAssignments from "./HouseholdAssignments";

vi.mock("../../api", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const page = (results: unknown[]) => ({ data: { results, next: null } });

beforeEach(() => {
  vi.mocked(api.post).mockResolvedValue({ data: {} });
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === "auth/csrf/") return { data: {} };
    if (url === "household-memberships/")
      return page([
        {
          id: "membership-1",
          resident: "resident-1",
          household: "household-1",
          relationship: "Child",
          occupancy_type: "FAMILY_MEMBER",
          is_head: false,
          valid_from: "2026-01-01",
          valid_to: null,
        },
      ]);
    if (url === "household-occupancies/")
      return page([
        {
          id: "occupancy-1",
          household: "household-1",
          housing_unit: "unit-1",
          valid_from: "2026-01-01",
          valid_to: null,
        },
      ]);
    if (url === "residents/")
      return page([
        {
          id: "resident-1",
          reference: "RES-001",
          given_name: "Ana",
          middle_name: "",
          family_name: "Synthetic",
          suffix: "",
        },
        {
          id: "resident-2",
          reference: "RES-002",
          given_name: "Ben",
          middle_name: "",
          family_name: "Example",
          suffix: "",
        },
      ]);
    if (url === "households/")
      return page([
        {
          id: "household-1",
          reference: "HH-001",
          label: "Source",
          is_active: true,
        },
        {
          id: "household-2",
          reference: "HH-002",
          label: "Destination",
          is_active: true,
        },
      ]);
    if (url === "housing-units/")
      return page([
        {
          id: "unit-1",
          reference: "HU-001",
          label: "First unit",
          is_active: true,
        },
        {
          id: "unit-2",
          reference: "HU-002",
          label: "Second unit",
          is_active: true,
        },
      ]);
    throw new Error(`Unexpected URL: ${url}`);
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("shows persisted assignments and posts member and housing workflow actions", async () => {
  render(
    <MemoryRouter>
      <HouseholdAssignments householdId="household-1" />
    </MemoryRouter>,
  );

  expect((await screen.findAllByText("Synthetic, Ana")).length).toBeGreaterThan(
    0,
  );
  expect(screen.getByText(/Currently assigned to First unit/)).toBeTruthy();

  fireEvent.change(screen.getByLabelText("Resident"), {
    target: { value: "resident-2" },
  });
  fireEvent.change(screen.getByLabelText("Relationship"), {
    target: { value: "Sibling" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Assign resident" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("households/household-1/members/", {
      resident: "resident-2",
      relationship: "Sibling",
      occupancy_type: "FAMILY_MEMBER",
      is_head: false,
      effective_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }),
  );

  fireEvent.change(screen.getByLabelText("Housing unit"), {
    target: { value: "unit-2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Move household" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("households/household-1/move/", {
      housing_unit: "unit-2",
      effective_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }),
  );
});

test("uses the transactional transfer endpoint for a current member", async () => {
  render(
    <MemoryRouter>
      <HouseholdAssignments householdId="household-1" />
    </MemoryRouter>,
  );
  await screen.findAllByText("Synthetic, Ana");
  fireEvent.change(screen.getByLabelText("Current member"), {
    target: { value: "membership-1" },
  });
  fireEvent.change(screen.getByLabelText("Transfer destination"), {
    target: { value: "household-2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Transfer member" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "household-memberships/membership-1/transfer/",
      expect.objectContaining({
        destination_household: "household-2",
        relationship: "Child",
        occupancy_type: "FAMILY_MEMBER",
        is_head: false,
      }),
    ),
  );
});
