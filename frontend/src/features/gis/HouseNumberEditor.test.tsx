// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import HouseNumberEditor from "./HouseNumberEditor";
import { gisApi } from "./api";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test("assigns a text house number to the housing unit only after saving", async () => {
  const save = vi
    .spyOn(gisApi, "numberHouse")
    .mockResolvedValue({ house_number: "12-A" });
  const saved = vi.fn();
  render(
    <HouseNumberEditor unitId="synthetic-unit" number="" onSaved={saved} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Assign house number" }));
  fireEvent.change(screen.getByLabelText("House number"), {
    target: { value: "12-A" },
  });
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save house number" }));
  await screen.findByText("House number saved.");
  expect(save).toHaveBeenCalledWith("synthetic-unit", "12-A");
  expect(saved).toHaveBeenCalledWith("12-A");
});
test("a denied number change never reports persistence or changes the displayed value", async () => {
  vi.spyOn(gisApi, "numberHouse").mockRejectedValue(Error("Forbidden"));
  const saved = vi.fn();
  render(
    <HouseNumberEditor unitId="synthetic-unit" number="12-A" onSaved={saved} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Assign house number" }));
  fireEvent.click(screen.getByRole("button", { name: "Save house number" }));
  expect(await screen.findByText(/House number was not saved/)).toBeTruthy();
  expect(saved).not.toHaveBeenCalled();
});
