import { expect, test } from "vitest";
import {
  prototypeResidents,
  prototypeHouseholds,
  prototypeUnits,
} from "./fixtures";
import { initialRelationships } from "./model";

test("prototype profiles preserve structured names and demographic details", () => {
  expect(prototypeResidents).toHaveLength(6);
  expect(
    prototypeResidents.find((row) => row.id === "DEMO-R001"),
  ).toMatchObject({
    firstName: "Maria",
    surname: "Santos",
    birthdate: "1981-06-12",
    civilStatus: "Married",
  });
  expect(
    prototypeResidents.find((row) => row.id === "DEMO-R006")?.surname,
  ).toBe("Dela Cruz");
});
test("each prototype household has correct members, head and separate unit", () => {
  const state = initialRelationships();
  expect(prototypeHouseholds).toHaveLength(4);
  expect(
    state.memberships.filter((item) => item.householdId === "DEMO-H001"),
  ).toHaveLength(3);
  for (const house of prototypeHouseholds) {
    const head = state.memberships.find(
      (item) => item.householdId === house.id && item.head,
    );
    expect(
      prototypeResidents.find((row) => row.id === head?.residentId)?.name,
    ).toBe(house.head);
    const occupancy = state.occupancies.find(
      (item) => item.householdId === house.id,
    );
    expect(prototypeUnits.some((row) => row.id === occupancy?.unitId)).toBe(
      true,
    );
  }
  expect(prototypeUnits[1]).toMatchObject({
    material: "Light materials",
    water: "Deep well",
    sanitation: "None",
    status: "Unmapped",
  });
});
