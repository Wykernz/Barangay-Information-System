import type { RecordRow } from "../../demo/catalog";
import { ageGroups, isSenior } from "./ageGroups";

export function matchesCategory(
  row: RecordRow,
  category: string,
  date: string,
): boolean {
  if (!category) return true;
  if (category === "active-households") return row.status === "Active";
  if (row.residencyClassification !== "Resident") return false;
  if (category === "pwd") return row.pwdStatus === "Yes";
  if (category === "lgbt") return row.lgbtIdentification === "Yes";
  if (category === "male") return row.sex === "Male";
  if (category === "female") return row.sex === "Female";
  if (category === "birthdate-missing") return !row.birthdate;
  if (category === "senior") return isSenior(row.birthdate, date);
  return ageGroups(row.birthdate, date).includes(category);
}
