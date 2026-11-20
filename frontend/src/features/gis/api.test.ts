import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../api";
import { gisApi, type MapHousehold } from "./api";

afterEach(() => vi.restoreAllMocks());
test("house numbering patches only the physical housing unit with a fresh CSRF cookie", async () => {
  const get = vi.spyOn(api, "get").mockResolvedValue({ data: {} });
  const patch = vi
    .spyOn(api, "patch")
    .mockResolvedValue({ data: { house_number: "12-A" } });
  expect(await gisApi.numberHouse("synthetic-unit", "12-A")).toEqual({
    house_number: "12-A",
  });
  expect(get).toHaveBeenCalledWith("auth/csrf/");
  expect(patch).toHaveBeenCalledWith("housing-units/synthetic-unit/", {
    house_number: "12-A",
  });
});
test("save uses authenticated same-origin API, fresh CSRF and expected house/location", async () => {
  const get = vi.spyOn(api, "get").mockResolvedValue({ data: {} });
  const post = vi
    .spyOn(api, "post")
    .mockResolvedValue({ data: { id: "household" } });
  const row = {
    id: "household",
    housing_unit: "house",
    location: { id: "revision" },
  } as MapHousehold;
  await gisApi.save(
    row,
    { latitude: 1.5, longitude: 2.5 },
    "Synthetic source",
    "0",
  );
  expect(get).toHaveBeenCalledWith("auth/csrf/");
  expect(post).toHaveBeenCalledWith("gis/households/household/location/", {
    latitude: 1.5,
    longitude: 2.5,
    source: "Synthetic source",
    accuracy_m: "0",
    expected_location: "revision",
    expected_housing_unit: "house",
  });
});
test("directory reads all pages so deep links do not lose later households", async () => {
  const get = vi
    .spyOn(api, "get")
    .mockResolvedValueOnce({
      data: {
        results: [{ id: "first" }],
        next: "http://localhost/api/v1/gis/households/?page=2",
      },
    })
    .mockResolvedValueOnce({
      data: { results: [{ id: "second" }], next: null },
    });
  expect(await gisApi.households()).toEqual([
    { id: "first" },
    { id: "second" },
  ]);
  expect(get).toHaveBeenLastCalledWith("gis/households/", {
    params: { page: 2 },
  });
});
test("server rejection remains an error and cannot be reported as saved", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: {} });
  vi.spyOn(api, "post").mockRejectedValue(Error("Forbidden"));
  const row = {
    id: "household",
    housing_unit: "house",
    location: null,
  } as MapHousehold;
  await expect(
    gisApi.save(row, { latitude: 1, longitude: 2 }, "Synthetic", ""),
  ).rejects.toThrow("Forbidden");
});
