import { expect, test } from "vitest";
import { matchesCategory } from "./categoryFilter";

test("overview categories include only the matching active-registry population", () => {
  const row = {
    id: "synthetic",
    residencyClassification: "Resident",
    pwdStatus: "Yes",
    sex: "Female",
    birthdate: "1960-01-01",
  };
  expect(matchesCategory(row, "pwd", "2026-11-19")).toBe(true);
  expect(
    matchesCategory({ ...row, pwdStatus: "No" }, "pwd", "2026-11-19"),
  ).toBe(false);
  expect(
    matchesCategory(
      { ...row, residencyClassification: "Non-resident" },
      "pwd",
      "2026-11-19",
    ),
  ).toBe(false);
  expect(matchesCategory(row, "senior", "2026-11-19")).toBe(true);
  expect(matchesCategory(row, "male", "2026-11-19")).toBe(false);
  expect(matchesCategory(row, "female", "2026-11-19")).toBe(true);
});
