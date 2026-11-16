// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DemoProvider } from "../../../demo/store";
import { ProfilingPage, ProfilingProvider } from "../Profiling";

beforeEach(() => {
  // jsdom does not implement native dialog visibility; reflect browser behavior.
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});
afterEach(cleanup);
function page(path: string, module: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider profilingFixtures>
        <ProfilingProvider>
          <Routes>
            <Route
              path={`/${module}`}
              element={<ProfilingPage module={module} />}
            />
            <Route
              path={`/${module}/:id`}
              element={<ProfilingPage module={module} />}
            />
          </Routes>
        </ProfilingProvider>
      </DemoProvider>
    </MemoryRouter>,
  );
}
test("registry keeps labeled actions and delete cancellation preserves records", () => {
  page("/residents", "residents");
  expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "View Santos, Maria" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Delete Santos, Maria" }));
  expect(screen.getByLabelText("Confirm record removal")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("link", { name: "View Santos, Maria" })).toBeTruthy();
});
test("resident create and edit save profile fields", () => {
  page("/residents", "residents");
  fireEvent.click(screen.getByRole("button", { name: "Add resident" }));
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Synthetic" },
  });
  fireEvent.change(screen.getByLabelText("Surname"), {
    target: { value: "Workflow" },
  });
  fireEvent.change(screen.getByLabelText("Birthdate"), {
    target: { value: "1995-01-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Workflow, Synthetic",
  );
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Updated" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "Workflow, Updated",
  );
});
test("archive search shows an empty state and restore does not reopen membership", () => {
  page("/residents", "residents");
  fireEvent.change(screen.getByLabelText("Search residents"), {
    target: { value: "Maria" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Delete Santos, Maria" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(screen.getByText(/No matching records/)).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Show archived records"));
  fireEvent.click(
    screen.getByRole("button", { name: "Restore Santos, Maria" }),
  );
  const row = screen
    .getByRole("link", { name: "View Santos, Maria" })
    .closest("tr")!;
  expect(within(row).getByText("Unassigned")).toBeTruthy();
});
test("same-household relationship edits persist as a new history segment", () => {
  page("/residents/DEMO-R002", "residents");
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  fireEvent.change(screen.getByLabelText("Household"), {
    target: { value: "DEMO-H001" },
  });
  fireEvent.change(screen.getByLabelText("Relationship"), {
    target: { value: "Sibling" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(screen.getByText(/Sibling.*Current/)).toBeTruthy();
  expect(screen.getByText(/Son.*2026-01-01/)).toBeTruthy();
});
test("a household with active members cannot be removed", () => {
  page("/households", "households");
  fireEvent.click(screen.getByRole("button", { name: "Delete HH-001" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(
    screen.getAllByText(
      "Unassign or transfer household members before removal.",
    ).length,
  ).toBeGreaterThan(0);
  expect(screen.getByRole("link", { name: "View HH-001" })).toBeTruthy();
});
test("registration has one dialog heading and retains all identity fields", () => {
  page("/residents", "residents");
  fireEvent.click(screen.getByRole("button", { name: "Add resident" }));
  expect(
    screen.getAllByRole("heading", { name: "Register resident" }),
  ).toHaveLength(1);
  for (const label of [
    "First name",
    "Surname",
    "Birthdate",
    "Sex",
    "Civil status",
    "Relationship",
  ]) {
    expect(screen.getByLabelText(label)).toBeTruthy();
  }
  expect(screen.getByRole("button", { name: "Save profile" })).toBeTruthy();
});
test("household keeps member controls, occupancy and survey sections", () => {
  page("/households/DEMO-H001", "households");
  expect(
    screen.getByRole("heading", { name: "Household members (3)" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Assign / transfer resident" }),
  ).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Unassign" })).toHaveLength(3);
  expect(
    screen.getByRole("heading", { name: "Housing occupancy history" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("heading", { name: "Household surveys" }),
  ).toBeNull();
});
