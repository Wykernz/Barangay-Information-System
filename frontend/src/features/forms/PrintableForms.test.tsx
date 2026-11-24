// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getProfileForm, listProfileForms } from "../../planner/api";
import { PrintableFormDetail, PrintableFormDirectory } from "./PrintableForms";

vi.mock("../../planner/api", async (original) => ({
  ...(await original<typeof import("../../planner/api")>()),
  getProfileForm: vi.fn(),
  listProfileForms: vi.fn(),
}));

const definition = {
  id: "form-1",
  module: "residents" as const,
  name: "Synthetic resident intake",
  version: 2,
  status: "active" as const,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  fields: [
    {
      id: 2,
      key: "notes",
      label: "Notes",
      help_text: "Synthetic test field",
      data_type: "long_text" as const,
      required: false,
      position: 2,
      options: [],
      sensitive: false,
    },
    {
      id: 1,
      key: "full_name",
      label: "Full name",
      help_text: "",
      data_type: "text" as const,
      required: true,
      position: 1,
      options: [],
      sensitive: false,
    },
  ],
};

beforeEach(() => {
  vi.mocked(listProfileForms).mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    results: [definition],
  });
  vi.mocked(getProfileForm).mockResolvedValue(definition);
  vi.stubGlobal("print", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("opens each form definition on its own printable route", async () => {
  render(
    <MemoryRouter initialEntries={["/forms"]}>
      <Routes>
        <Route path="/forms" element={<PrintableFormDirectory />} />
        <Route path="/forms/:id" element={<PrintableFormDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Synthetic resident intake")).toBeTruthy();
  fireEvent.click(screen.getByRole("link", { name: "Open printable form" }));
  expect(
    await screen.findByLabelText("Synthetic resident intake printable form"),
  ).toBeTruthy();
  expect(getProfileForm).toHaveBeenCalledWith("form-1");
  expect(screen.getByText("1. Full name")).toBeTruthy();
  expect(screen.getByText("2. Notes")).toBeTruthy();
});

test("prints only the selected form through the browser print dialog", async () => {
  render(
    <MemoryRouter initialEntries={["/forms/form-1"]}>
      <Routes>
        <Route path="/forms/:id" element={<PrintableFormDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByLabelText("Synthetic resident intake printable form");
  fireEvent.click(screen.getByRole("button", { name: "Print this form" }));
  expect(window.print).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Not an issued certificate/)).toBeTruthy();
});
