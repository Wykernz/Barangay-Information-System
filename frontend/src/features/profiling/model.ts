/** Relationship records are separate from people and retain ended assignments. */
export type Membership = {
  id: string;
  residentId: string;
  householdId: string;
  relationship: string;
  start: string;
  end: string | null;
  head: boolean;
  familyId?: string;
};
export type Occupancy = {
  id: string;
  householdId: string;
  unitId: string;
  start: string;
  end: string | null;
};
export type Relationships = {
  families?: { id: string; householdId: string; label: string }[];
  memberships: Membership[];
  occupancies: Occupancy[];
};
export const initialRelationships = (): Relationships => ({
  memberships: [
    ["001", "001", "Head"],
    ["002", "001", "Son"],
    ["003", "001", "Daughter"],
    ["004", "002", "Head"],
    ["005", "003", "Head"],
    ["006", "004", "Head"],
  ].map(([resident, household, relationship], index) => ({
    id: index === 0 ? "DEMO-M1" : `DEMO-M${index + 1}`,
    residentId: `DEMO-R${resident}`,
    householdId: `DEMO-H${household}`,
    relationship,
    head: relationship === "Head",
    start: "2026-01-01",
    end: null,
  })),
  occupancies: ["001", "002", "003", "004"].map((number) => ({
    id: `DEMO-O${number}`,
    householdId: `DEMO-H${number}`,
    unitId: `DEMO-U${number}`,
    start: "2026-01-01",
    end: null,
  })),
});
/** Demo policy: one current household; production cardinality awaits stakeholder approval. */
export function assign(
  state: Relationships,
  residentId: string,
  householdId: string | null,
  relationship: string,
  date: string,
  id: string,
): Relationships {
  const active = state.memberships.filter(
    (item) => item.residentId === residentId && !item.end,
  );
  if (active.some((item) => date < item.start))
    throw new Error("Effective date precedes the current membership.");
  return {
    ...state,
    memberships: [
      ...state.memberships.map((item) =>
        active.includes(item) ? { ...item, end: date } : item,
      ),
      ...(householdId
        ? [
            {
              id,
              residentId,
              householdId,
              relationship,
              start: date,
              end: null,
              head: false,
              familyId: active.find((item) => item.householdId === householdId)
                ?.familyId,
            },
          ]
        : []),
    ],
  };
}
export function selectHead(
  state: Relationships,
  householdId: string,
  residentId: string,
  date: string,
): Relationships {
  const members = state.memberships.filter(
    (item) => item.householdId === householdId && !item.end,
  );
  if (!members.some((item) => item.residentId === residentId))
    throw new Error("The head must be a current member.");
  if (members.some((item) => date < item.start))
    throw new Error("Effective date precedes a membership.");
  // End and supersede changed membership segments so previous heads remain visible.
  const changed = members.filter(
    (item) => item.head !== (item.residentId === residentId),
  );
  return {
    ...state,
    memberships: [
      ...state.memberships.map((item) =>
        changed.includes(item) ? { ...item, end: date } : item,
      ),
      ...changed.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        start: date,
        head: item.residentId === residentId,
        end: null,
      })),
    ],
  };
}

/** Supersede one membership without changing household, relationship or head. */
export function assignFamily(
  state: Relationships,
  membershipId: string,
  familyId: string | undefined,
  date: string,
  id: string,
): Relationships {
  const member = state.memberships.find(
    (item) => item.id === membershipId && !item.end,
  );
  if (!member) throw new Error("Choose a current household member.");
  if (
    familyId &&
    !state.families?.some(
      (family) =>
        family.id === familyId && family.householdId === member.householdId,
    )
  )
    throw new Error("Choose a family in this household.");
  if (date < member.start)
    throw new Error("Family assignment cannot precede membership.");
  if (member.familyId === familyId) return state;
  return {
    ...state,
    memberships: [
      ...state.memberships.map((item) =>
        item.id === member.id ? { ...item, end: date } : item,
      ),
      { ...member, id, familyId, start: date, end: null },
    ],
  };
}
