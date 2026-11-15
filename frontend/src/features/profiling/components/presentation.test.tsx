// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
