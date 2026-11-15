import { afterEach, expect, test, vi } from "vitest";
import { AxiosError } from "axios";
import { api } from "../../api";
import { profilingApi, ProfilingRequestError } from "./api";

afterEach(() => vi.restoreAllMocks());
function reject(status: number, data: unknown = {}) {
  return new AxiosError("request failed", undefined, undefined, undefined, {
    status,
    statusText: "",
    data,
    headers: {},
    config: {} as never,
  });
}
test("registry reads preserve pagination and pass search parameters", async () => {
  const payload = { count: 0, next: null, previous: null, results: [] };
  const send = vi.spyOn(api, "request").mockResolvedValue({ data: payload });
  expect(
    await profilingApi.residents.list({ search: "Santos", page: 2 }),
  ).toEqual(payload);
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "get",
      url: "residents/",
      params: { search: "Santos", page: 2 },
    }),
  );
});
test("transfer acquires CSRF and sends concurrency/effective-date payload unchanged", async () => {
  const csrf = vi.spyOn(api, "get").mockResolvedValue({ data: {} });
  const send = vi.spyOn(api, "request").mockResolvedValue({
    data: {
      ended_membership: {},
      created_membership: {},
      household_versions: {},
    },
  });
  const input = {
    destination_household_id: "household-id",
    relationship: "member",
    effective_date: "2026-11-15",
    reason: "move",
    expected_version: 4,
  };
  await profilingApi.transfer("membership/id", input);
  expect(csrf).toHaveBeenCalledWith("auth/csrf/");
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "post",
      url: "memberships/membership%2Fid/transfer/",
      data: input,
    }),
  );
  expect(csrf.mock.invocationCallOrder[0]).toBeLessThan(
    send.mock.invocationCallOrder[0],
  );
});
test("CSRF failure prevents mutation", async () => {
  vi.spyOn(api, "get").mockRejectedValue(reject(403));
  const send = vi.spyOn(api, "request");
  await expect(
    profilingApi.residents.archive("id", true, 1),
  ).rejects.toMatchObject({ status: 403 });
  expect(send).not.toHaveBeenCalled();
});
test("field validation and conflicts remain rejected saves", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: {} });
  const send = vi
    .spyOn(api, "request")
    .mockRejectedValue(reject(400, { birthdate: ["Invalid date."] }));
  await expect(
    profilingApi.residents.update("id", { expected_version: 2 }),
  ).rejects.toMatchObject({ fields: { birthdate: ["Invalid date."] } });
  send.mockRejectedValueOnce(reject(409));
  await expect(
    profilingApi.residents.update("id", { expected_version: 2 }),
  ).rejects.toMatchObject({ status: 409 });
});
test("network failure does not fall back to sample records", async () => {
  vi.spyOn(api, "request").mockRejectedValue(new Error("offline"));
  await expect(profilingApi.residents.get("id")).rejects.toBeInstanceOf(
    ProfilingRequestError,
  );
});
test("removal uses versioned archive PATCH rather than DELETE", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: {} });
  const send = vi.spyOn(api, "request").mockResolvedValue({ data: {} });
  await profilingApi.households.archive("id", true, 3);
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "patch",
      url: "households/id/",
      data: { archived: true, expected_version: 3 },
    }),
  );
});
