// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

afterEach(() => vi.restoreAllMocks());

test("unexpected render errors show a recovery page instead of a blank screen", () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  function BrokenPage(): never {
    throw new Error("synthetic render failure");
  }
  render(
    <AppErrorBoundary>
      <BrokenPage />
    </AppErrorBoundary>,
  );
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.getByText("The interface could not display this page")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Refresh page" })).toBeTruthy();
});
