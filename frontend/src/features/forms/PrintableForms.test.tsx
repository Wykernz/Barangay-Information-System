// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  kpForms,
  PrintableFormDetail,
  PrintableFormDirectory,
} from "./PrintableForms";

afterEach(cleanup);

test("lists every supplied KP form and filters by form number", () => {
  render(
    <MemoryRouter>
      <PrintableFormDirectory />
    </MemoryRouter>,
  );
  expect(kpForms).toHaveLength(27);
  expect(screen.getByText("Notice to Constitute the Lupon")).toBeTruthy();
  expect(screen.getByText("Notice of Execution")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Search forms"), {
    target: { value: "20-A" },
  });
  expect(screen.getByText("KP Form No. 20-A")).toBeTruthy();
  expect(screen.queryByText("Notice of Execution")).toBeNull();
});

test("opens one exact PDF at a time with print and download actions", () => {
  render(
    <MemoryRouter initialEntries={["/forms/kp-07"]}>
      <Routes>
        <Route path="/forms/:id" element={<PrintableFormDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: "Complaint" })).toBeTruthy();
  const print = screen.getByRole("link", { name: "Open PDF to print" });
  expect(print.getAttribute("href")).toBe("/forms/kp/kp-page-07.pdf");
  expect(print.getAttribute("target")).toBe("_blank");
  expect(
    screen.getByRole("link", { name: "Download PDF" }).hasAttribute("download"),
  ).toBe(true);
  expect(screen.getByLabelText("KP Form No. 7 Complaint preview")).toBeTruthy();
});

test("keeps both summons pages together as one printable KP Form No. 9", () => {
  render(
    <MemoryRouter initialEntries={["/forms/kp-09"]}>
      <Routes>
        <Route path="/forms/:id" element={<PrintableFormDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("Summons and Officer’s Return")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Open PDF to print" })
      .getAttribute("href"),
  ).toBe("/forms/kp/kp-form-09.pdf");
  expect(screen.getByText(/includes both of its pages/i)).toBeTruthy();
});
