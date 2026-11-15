// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoProvider } from "../demo/store";
import RecordPage from "./RecordPage";
import { ageAt } from "../demo/catalog";

afterEach(cleanup);

test("directory search has a recoverable empty state", () => {
  render(
    <DemoProvider>
      <RecordPage module="residents" />
    </DemoProvider>,
  );
  fireEvent.change(screen.getByLabelText("Search records"), {
    target: { value: "no-such-person" },
  });
  expect(screen.getByText("No matching records")).toBeTruthy();
  fireEvent.click(screen.getByText("Clear filters"));
  expect(screen.getByText("Sample Resident A")).toBeTruthy();
});

test("editing a demo resident updates the directory without a server request", () => {
  render(
    <DemoProvider>
      <RecordPage module="residents" />
    </DemoProvider>,
  );
  fireEvent.click(screen.getByLabelText("Edit Sample Resident A"));
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Synthetic Edited Resident" },
  });
  fireEvent.click(screen.getByText("Save record"));
  expect(screen.getByText("Synthetic Edited Resident")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain(
    "No server data was changed",
  );
});

test("future birthdate cannot be saved", () => {
  render(
    <DemoProvider>
      <RecordPage module="residents" />
    </DemoProvider>,
  );
  fireEvent.click(screen.getByLabelText("Edit Sample Resident A"));
  fireEvent.change(screen.getByLabelText("Birthdate"), {
    target: { value: "2999-01-01" },
  });
  fireEvent.click(screen.getByText("Save record"));
  expect(screen.getByRole("alert").textContent).toContain(
    "cannot be in the future",
  );
});

test("age changes on the birthday rather than January 1", () => {
  expect(ageAt("2000-06-15", new Date(2026, 5, 14))).toBe(25);
  expect(ageAt("2000-06-15", new Date(2026, 5, 15))).toBe(26);
});
