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
import { AxiosError } from "axios";
import { api } from "../api";
import FieldPlanner from "./FieldPlanner";
import type { FormDefinition, PaginatedForms } from "./api";

const emptyPage: PaginatedForms = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

function form(overrides: Partial<FormDefinition> = {}): FormDefinition {
  return {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    module: "households",
    name: "Existing draft",
    version: 2,
    status: "draft",
    created_at: "2026-11-15T08:00:00Z",
    updated_at: "2026-11-15T08:00:00Z",
    fields: [],
    ...overrides,
  };
}

function renderPlanner() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FieldPlanner />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("creates a backend draft with configured choice-field metadata", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: emptyPage } as never);
  const saved = form({
    module: "residents",
    name: "Workshop resident profile",
    version: 1,
    fields: [
      {
        id: 1,
        key: "preferred_contact",
        label: "Preferred contact",
        help_text: "Synthetic field for workshop discussion",
        data_type: "choice",
        required: true,
        position: 0,
        options: ["Phone", "Visit"],
        sensitive: true,
      },
    ],
  });
  const post = vi
    .spyOn(api, "post")
    .mockResolvedValue({ data: saved } as never);
  renderPlanner();

  await screen.findByText("No saved definitions");
  fireEvent.change(screen.getByLabelText("Definition name"), {
    target: { value: "Workshop resident profile" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add field" }));
  fireEvent.change(screen.getByLabelText("Field key"), {
    target: { value: "preferred_contact" },
  });
  fireEvent.change(screen.getByLabelText("Display label"), {
    target: { value: "Preferred contact" },
  });
  fireEvent.change(screen.getByLabelText("Help text (optional)"), {
    target: { value: "Synthetic field for workshop discussion" },
  });
  fireEvent.change(screen.getByLabelText("Data type"), {
    target: { value: "choice" },
  });
  fireEvent.change(screen.getByLabelText("Options (one per line)"), {
    target: { value: "Phone\nVisit" },
  });
  fireEvent.click(screen.getByLabelText("Required field"));
  fireEvent.click(screen.getByLabelText("Sensitive field"));

  expect(screen.getByLabelText(/Preferred contact/)).toHaveProperty(
    "disabled",
    true,
  );
  expect(screen.getAllByText(/privacy review/i).length).toBeGreaterThan(0);
  fireEvent.click(
    screen.getByRole("button", { name: "Create draft definition" }),
  );

  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  expect(post).toHaveBeenCalledWith("profile-forms/", {
    module: "residents",
    name: "Workshop resident profile",
    version: 1,
    status: "draft",
    fields: [
      {
        key: "preferred_contact",
        label: "Preferred contact",
        help_text: "Synthetic field for workshop discussion",
        data_type: "choice",
        required: true,
        position: 0,
        options: ["Phone", "Visit"],
        sensitive: true,
      },
    ],
  });
});

test("a failed save leaves the new definition and fields editable", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: emptyPage } as never);
  vi.spyOn(api, "post").mockRejectedValue(
    new AxiosError("Unavailable", undefined, undefined, undefined, {
      status: 503,
      statusText: "Unavailable",
      data: {},
      headers: {},
      config: {} as never,
    }),
  );
  renderPlanner();

  await screen.findByText("No saved definitions");
  fireEvent.change(screen.getByLabelText("Definition name"), {
    target: { value: "Unsaved workshop design" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add field" }));
  fireEvent.change(screen.getByLabelText("Field key"), {
    target: { value: "discussion_note" },
  });
  fireEvent.change(screen.getByLabelText("Display label"), {
    target: { value: "Discussion note" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Create draft definition" }),
  );

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("service is unavailable");
  expect(alert.textContent).toContain("Your edits are still here");
  expect(screen.getByLabelText("Definition name")).toHaveProperty(
    "value",
    "Unsaved workshop design",
  );
  expect(screen.getByLabelText("Field key")).toHaveProperty(
    "value",
    "discussion_note",
  );
});

test("reordered fields are submitted with their new positions", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: emptyPage } as never);
  const post = vi.spyOn(api, "post").mockResolvedValue({
    data: form({ id: "created-id", name: "Ordering test" }),
  } as never);
  renderPlanner();

  await screen.findByText("No saved definitions");
  fireEvent.change(screen.getByLabelText("Definition name"), {
    target: { value: "Ordering test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add field" }));
  fireEvent.click(screen.getByRole("button", { name: "Add field" }));
  const keys = screen.getAllByLabelText("Field key");
  const labels = screen.getAllByLabelText("Display label");
  fireEvent.change(keys[0], { target: { value: "first_key" } });
  fireEvent.change(labels[0], { target: { value: "First field" } });
  fireEvent.change(keys[1], { target: { value: "second_key" } });
  fireEvent.change(labels[1], { target: { value: "Second field" } });
  fireEvent.click(screen.getByRole("button", { name: "Move field 2 up" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Create draft definition" }),
  );

  await waitFor(() => expect(post).toHaveBeenCalled());
  const payload = post.mock.calls[0][1] as {
    fields: Array<{ key: string; position: number }>;
  };
  expect(payload.fields.map((field) => [field.key, field.position])).toEqual([
    ["second_key", 0],
    ["first_key", 1],
  ]);
});

test("an existing draft saves edited metadata through PATCH", async () => {
  const existing = form();
  vi.spyOn(api, "get").mockImplementation(async (url) => {
    if (url === "profile-forms/") {
      return {
        data: { ...emptyPage, count: 1, results: [existing] },
      } as never;
    }
    return { data: existing } as never;
  });
  const saved = { ...existing, name: "Revised workshop draft" };
  const patch = vi
    .spyOn(api, "patch")
    .mockResolvedValue({ data: saved } as never);
  renderPlanner();

  fireEvent.click(
    await screen.findByRole("button", { name: /Existing draft/ }),
  );
  await screen.findByRole("heading", { name: "Existing draft", level: 2 });
  fireEvent.change(screen.getByLabelText("Definition name"), {
    target: { value: "Revised workshop draft" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft changes" }));

  await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
  expect(patch).toHaveBeenCalledWith(`profile-forms/${existing.id}/`, {
    module: "households",
    name: "Revised workshop draft",
    version: 2,
    status: "draft",
    fields: [],
  });
  expect(await screen.findByText(/Draft definition saved/)).toBeTruthy();
});

test("active definitions are read-only and use the detail endpoint", async () => {
  const active = form({
    name: "Approved synthetic profile",
    status: "active",
    fields: [
      {
        key: "household_note",
        label: "Household note",
        help_text: "",
        data_type: "long_text",
        required: false,
        position: 0,
        options: [],
        sensitive: false,
      },
    ],
  });
  const get = vi.spyOn(api, "get").mockImplementation(async (url) => {
    if (url === "profile-forms/") {
      return {
        data: { ...emptyPage, count: 1, results: [active] },
      } as never;
    }
    return { data: active } as never;
  });
  renderPlanner();

  fireEvent.click(
    await screen.findByRole("button", { name: /Approved synthetic profile/ }),
  );
  await screen.findByRole("heading", {
    name: "Approved synthetic profile",
    level: 2,
  });
  expect(get).toHaveBeenCalledWith(`profile-forms/${active.id}/`);
  expect(screen.getByText(/read-only/)).toBeTruthy();
  expect(screen.getByLabelText("Definition name")).toHaveProperty(
    "readOnly",
    true,
  );
  expect(screen.getByLabelText("Data type")).toHaveProperty("disabled", true);
  expect(
    screen.queryByRole("button", { name: "Save draft changes" }),
  ).toBeNull();
});

test("a reviewed draft is activated through the backend action", async () => {
  const existing = form({ name: "Reviewed workshop draft" });
  vi.spyOn(api, "get").mockImplementation(async (url) => {
    if (url === "profile-forms/") {
      return {
        data: { ...emptyPage, count: 1, results: [existing] },
      } as never;
    }
    return { data: existing } as never;
  });
  const post = vi.spyOn(api, "post").mockResolvedValue({
    data: { ...existing, status: "active" },
  } as never);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  renderPlanner();

  fireEvent.click(
    await screen.findByRole("button", { name: /Reviewed workshop draft/ }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Activate reviewed version" }),
  );

  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(`profile-forms/${existing.id}/activate/`),
  );
  expect(window.confirm).toHaveBeenCalledOnce();
  expect(
    await screen.findByText("Definition active (version 2)."),
  ).toBeTruthy();
});

test("a forbidden list response explains the access problem", async () => {
  vi.spyOn(api, "get").mockRejectedValue(
    new AxiosError("Forbidden", undefined, undefined, undefined, {
      status: 403,
      statusText: "Forbidden",
      data: {},
      headers: {},
      config: {} as never,
    }),
  );
  renderPlanner();

  expect((await screen.findByRole("alert")).textContent).toContain(
    "does not have permission",
  );
  expect(
    screen.getByRole("button", { name: "Retry definition list" }),
  ).toBeTruthy();
});
