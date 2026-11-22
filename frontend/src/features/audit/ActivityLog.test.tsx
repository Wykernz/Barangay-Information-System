// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "../../api";
import ActivityLog from "./ActivityLog";

vi.mock("../../api", () => ({ api: { get: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("activity log renders paginated audit fields only and applies filters", async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: "event-1",
          occurred_at: "2026-11-22T00:00:00Z",
          actor: 5,
          actor_username: "staff-one",
          action: "households.household.create",
          target_type: "households.household",
          target_id: "record-1",
        },
      ],
    },
  });
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ActivityLog />
    </QueryClientProvider>,
  );
  expect(await screen.findByText("households.household.create")).toBeTruthy();
  expect(screen.getByText("record-1")).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith("audit/events/", {
    params: { page: 1 },
  });
  fireEvent.change(screen.getByLabelText("Staff username"), {
    target: { value: "staff-one" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() =>
    expect(api.get).toHaveBeenLastCalledWith("audit/events/", {
      params: { staff: "staff-one", page: 1 },
    }),
  );
});
