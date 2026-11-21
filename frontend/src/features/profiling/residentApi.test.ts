// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../api";
import { loadResidents, persistResident } from "./residentApi";

afterEach(() => vi.restoreAllMocks());
const response = {
  id: "resident-id",
  reference: "RES-SYNTHETIC",
  given_name: "Synthetic",
  family_name: "Test",
  verification_status: "unverified",
  created_at: "2026-11-21T01:00:00Z",
};

test("resident loading follows pagination and preserves generated identity", async () => {
  const get = vi
    .spyOn(api, "get")
    .mockResolvedValueOnce({ data: { results: [response], next: "next-page" } })
    .mockResolvedValueOnce({
      data: { results: [{ ...response, id: "second" }], next: null },
    });
  const rows = await loadResidents(new AbortController().signal);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    id: "resident-id",
    personId: "RES-SYNTHETIC",
    _storage: "database",
  });
  expect(get.mock.calls[1][1]?.params).toEqual({ page: 2 });
});

test("new resident acquires CSRF and sends only editable base fields", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: {} });
  const post = vi.spyOn(api, "post").mockResolvedValue({ data: response });
  const saved = await persistResident({
    id: "temporary",
    firstName: "Synthetic",
    surname: "Test",
    email: "test@example.invalid",
    age: "99",
    personId: "FORGED",
    status: "Verified",
    registrationDate: "1900-01-01",
    lgbtIdentification: "private",
  });
  expect(post).toHaveBeenCalledWith("residents/", {
    given_name: "Synthetic",
    family_name: "Test",
    email: "test@example.invalid",
    is_archived: false,
  });
  expect(saved.id).toBe("resident-id");
});

test("database photo edits use multipart PATCH without replacing custom values", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: {} });
  const patch = vi.spyOn(api, "patch").mockResolvedValue({ data: response });
  const photo = new File(["synthetic"], "test.png", { type: "image/png" });
  await persistResident(
    {
      id: "resident-id",
      _storage: "database",
      firstName: "Synthetic",
      archived: "true",
    },
    photo,
  );
  const [url, body] = patch.mock.calls[0];
  expect(url).toBe("residents/resident-id/");
  expect(body).toBeInstanceOf(FormData);
  expect((body as FormData).get("photo")).toBe(photo);
  expect((body as FormData).get("is_archived")).toBe("true");
  expect((body as FormData).has("values")).toBe(false);
});

test("CSRF failure prevents saving instead of falling back to local state", async () => {
  vi.spyOn(api, "get").mockRejectedValue(new Error("denied"));
  const post = vi.spyOn(api, "post");
  await expect(persistResident({ id: "temporary" })).rejects.toThrow("denied");
  expect(post).not.toHaveBeenCalled();
});
