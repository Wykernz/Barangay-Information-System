// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../../api";
import { DemoProvider } from "../../demo/store";
import { ProfilingPage, ProfilingProvider } from "./Profiling";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.spyOn(api, "get").mockImplementation(async (path) => ({
    data: path === "residents/" ? { results: [], next: null } : {},
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function page(path = "/residents") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider profilingFixtures persistResidents>
        <ProfilingProvider>
          <Routes>
            <Route
              path="/residents"
              element={<ProfilingPage module="residents" />}
            />
            <Route
              path="/residents/:id"
              element={<ProfilingPage module="residents" />}
            />
          </Routes>
        </ProfilingProvider>
      </DemoProvider>
    </MemoryRouter>,
  );
}
function complete() {
  fireEvent.click(screen.getByRole("button", { name: "Add resident" }));
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Synthetic" },
  });
  fireEvent.change(screen.getByLabelText("Surname"), {
    target: { value: "Field Test" },
  });
  fireEvent.change(screen.getByLabelText("Residency classification"), {
    target: { value: "Resident" },
  });
  for (const [label, value] of [
    ["Birth month", "01"],
    ["Birth day", "01"],
    ["Birth year", "2000"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

test("requested fields, generated identifiers, optional email and photo are present", async () => {
  page();
  complete();
  for (const field of [
    "Suffix",
    "Nationality",
    "Place of birth",
    "Contact number",
    "Email address",
    "Residency status",
    "Record status",
  ])
    expect(screen.getByLabelText(field)).toBeTruthy();
  expect(
    (screen.getByLabelText("Person ID") as HTMLInputElement).readOnly,
  ).toBe(true);
  expect(
    (screen.getByLabelText("Date of registration") as HTMLInputElement)
      .readOnly,
  ).toBe(true);
  expect(
    (screen.getByLabelText("Email address") as HTMLInputElement).required,
  ).toBe(false);
  expect(screen.getByText(/Calculated age:/)).toBeTruthy();
  expect(
    (screen.getByLabelText(/Profile photo/) as HTMLInputElement).disabled,
  ).toBe(false);
  expect(
    (screen.getByLabelText("Record status") as HTMLSelectElement).value,
  ).toBe("Active");
});

test("save waits for server confirmation then opens the generated resident", async () => {
  const post = vi.spyOn(api, "post").mockResolvedValue({
    data: {
      id: "real-id",
      reference: "RES-SYNTHETIC",
      given_name: "Synthetic",
      family_name: "Field Test",
      birth_date: "2000-01-01",
      residency_classification: "Resident",
      record_status: "Active",
      created_at: "2026-11-21T01:00:00Z",
      verification_status: "unverified",
    },
  });
  page();
  complete();
  fireEvent.change(screen.getByLabelText("Nationality"), {
    target: { value: "Synthetic nationality" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  await waitFor(() => expect(screen.getByText("RES-SYNTHETIC")).toBeTruthy());
  expect(await screen.findByText("Database record")).toBeTruthy();
  expect(post.mock.calls[0][1]).toMatchObject({
    nationality: "Synthetic nationality",
    record_status: "Active",
  });
});

test("failed saves keep the draft open and show a failure", async () => {
  vi.spyOn(api, "post").mockRejectedValue(new Error("offline"));
  page();
  complete();
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  await waitFor(() =>
    expect(
      screen.getAllByText(/Resident could not be saved/).length,
    ).toBeGreaterThan(0),
  );
  expect((screen.getByLabelText("First name") as HTMLInputElement).value).toBe(
    "Synthetic",
  );
  expect(screen.getByRole("button", { name: "Save profile" })).toBeTruthy();
});

test("reopening a database resident loads its persisted fields", async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: {
      results: [
        {
          id: "saved-id",
          reference: "RES-REOPENED",
          given_name: "Synthetic",
          family_name: "Reopened",
          nationality: "Synthetic nationality",
          record_status: "Moved out",
          created_at: "2026-11-21T01:00:00Z",
          verification_status: "unverified",
        },
      ],
      next: null,
    },
  });
  page("/residents/saved-id");
  expect(await screen.findByText("Database record")).toBeTruthy();
  expect(screen.getByText("Synthetic nationality")).toBeTruthy();
  expect(screen.getByText("Moved out")).toBeTruthy();
});
