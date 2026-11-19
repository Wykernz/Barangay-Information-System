import { expect, test } from "vitest";
import { AGE_GROUPS, ageGroups, isSenior } from "./ageGroups";
test("approved bands include both bounds and change on birthdays", () => {
  for (const { min, max, label } of AGE_GROUPS) {
    for (const age of [min, max])
      expect(ageGroups(String(2026 - age) + "-11-19", "2026-11-19")).toEqual([
        label,
      ]);
    if (min > 0)
      expect(
        ageGroups(String(2026 - min) + "-11-20", "2026-11-19"),
      ).not.toContain(label);
  }
});
test("unassigned ages remain separate from senior status", () => {
  expect(ageGroups("1951-11-19", "2026-11-19")).toEqual([]);
  expect(isSenior("1951-11-19", "2026-11-19")).toBe(true);
  expect(isSenior("1966-11-20", "2026-11-19")).toBe(false);
  for (const date of ["", "invalid", "2026-11-20"])
    expect(ageGroups(date, "2026-11-19")).toEqual([]);
});
