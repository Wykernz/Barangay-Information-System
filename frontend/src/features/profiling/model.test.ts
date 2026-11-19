import { expect, test } from "vitest";
import {
  assign,
  assignFamily,
  initialRelationships,
  selectHead,
} from "./model";

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

test("family reassignment retains the head, history and one current membership", () => {
  const state = {
    ...initialRelationships(),
    families: [
      { id: "a", householdId: "DEMO-H001", label: "Synthetic A" },
      { id: "b", householdId: "DEMO-H001", label: "Synthetic B" },
      { id: "other", householdId: "DEMO-H002", label: "Other household" },
    ],
  };
  const first = assignFamily(state, "DEMO-M1", "a", "2026-11-19", "family-a");
  const second = assignFamily(first, "family-a", "b", "2026-11-19", "family-b");
  expect(
    second.memberships.filter(
      (member) => !member.end && member.residentId === "DEMO-R001",
    ),
  ).toEqual([
    expect.objectContaining({
      familyId: "b",
      head: true,
      householdId: "DEMO-H001",
    }),
  ]);
  expect(
    second.memberships.find((member) => member.id === "family-a"),
  ).toMatchObject({ familyId: "a", end: "2026-11-19" });
  expect(state.memberships[0].end).toBeNull();
  expect(() =>
    assignFamily(second, "family-b", "other", "2026-11-19", "invalid"),
  ).toThrow("in this household");
  expect(() =>
    assignFamily(second, "family-b", "a", "2026-01-01", "invalid"),
  ).toThrow("precede");
  expect(() =>
    assignFamily(second, "DEMO-M1", "a", "2026-11-19", "invalid"),
  ).toThrow("current household member");
});

test("relationship edits retain a family while household transfers clear it", () => {
  const initial = {
    ...initialRelationships(),
    families: [{ id: "a", householdId: "DEMO-H001", label: "Synthetic A" }],
  };
  const grouped = assignFamily(
    initial,
    "DEMO-M2",
    "a",
    "2026-11-19",
    "grouped",
  );
  const edited = assign(
    grouped,
    "DEMO-R002",
    "DEMO-H001",
    "Sibling",
    "2026-11-19",
    "edited",
  );
  expect(
    edited.memberships.find((member) => member.id === "edited")?.familyId,
  ).toBe("a");
  const transferred = assign(
    edited,
    "DEMO-R002",
    "DEMO-H002",
    "Member",
    "2026-11-19",
    "transferred",
  );
  expect(
    transferred.memberships.find((member) => member.id === "transferred")
      ?.familyId,
  ).toBeUndefined();
  const ungrouped = assignFamily(
    edited,
    "edited",
    undefined,
    "2026-11-19",
    "ungrouped",
  );
  expect(
    ungrouped.memberships.filter(
      (member) => !member.end && member.householdId === "DEMO-H001",
    ),
  ).toHaveLength(3);
  expect(
    ungrouped.memberships.find((member) => member.id === "ungrouped")?.familyId,
  ).toBeUndefined();
});
