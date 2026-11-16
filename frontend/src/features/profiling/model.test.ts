import { expect, test } from "vitest";
import { assign, initialRelationships, selectHead } from "./model";

test("transfer preserves history and only one current demo membership", () => {
  const initial = initialRelationships();
  const next = assign(
    initial,
    "DEMO-R001",
    "DEMO-H002",
    "Member",
    "2026-11-15",
    "new",
  );
  expect(next.memberships[0].end).toBe("2026-11-15");
  expect(
    next.memberships.filter(
      (item) => item.residentId === "DEMO-R001" && !item.end,
    ),
  ).toHaveLength(1);
  expect(initial.memberships[0].end).toBeNull();
});
test("unassignment retains old segments", () => {
  const next = assign(
    initialRelationships(),
    "DEMO-R001",
    null,
    "Member",
    "2026-11-15",
    "new",
  );
  expect(next.memberships).toHaveLength(6);
  expect(
    next.memberships.filter(
      (item) => item.residentId === "DEMO-R001" && !item.end,
    ),
  ).toHaveLength(0);
});
test("head must be a member and previous head is preserved", () => {
  expect(() =>
    selectHead(initialRelationships(), "DEMO-H001", "DEMO-R004", "2026-11-15"),
  ).toThrow("current member");
  const next = selectHead(
    initialRelationships(),
    "DEMO-H001",
    "DEMO-R003",
    "2026-11-15",
  );
  expect(
    next.memberships
      .filter(
        (item) => item.householdId === "DEMO-H001" && item.head && !item.end,
      )
      .map((item) => item.residentId),
  ).toEqual(["DEMO-R003"]);
  expect(
    next.memberships.some(
      (item) => item.residentId === "DEMO-R001" && item.head && item.end,
    ),
  ).toBe(true);
});
test("cannot backdate before current membership", () => {
  expect(() =>
    assign(
      initialRelationships(),
      "DEMO-R001",
      null,
      "Member",
      "2020-01-01",
      "new",
    ),
  ).toThrow("precedes");
});
