// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { getSession } from "./api";
vi.mock("./api", () => ({
  getSession: vi.fn(),
  signIn: vi.fn(),
  api: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("./Workspace", () => ({
  default: () => <p>Main barangay workspace</p>,
}));
vi.mock("./HealthWorkspace", () => ({
  default: () => <p>Protected health workspace</p>,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function page() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={["/residents"]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
test("healthcare-only login cannot render the main workspace even at a resident URL", async () => {
  vi.mocked(getSession).mockResolvedValue({
    username: "synthetic-healthcare",
    display_name: "Health Center Admin",
    health_only: true,
  });
  page();
  expect(await screen.findByText("Protected health workspace")).toBeTruthy();
  expect(screen.getByText("Signed in as Health Center Admin")).toBeTruthy();
  expect(screen.queryByText("Main barangay workspace")).toBeNull();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
});
test("barangay administrator lands in the main workspace", async () => {
  vi.mocked(getSession).mockResolvedValue({
    username: "synthetic-barangay",
    health_only: false,
  });
  page();
  expect(await screen.findByText("Main barangay workspace")).toBeTruthy();
  expect(screen.queryByText("Protected health workspace")).toBeNull();
});
