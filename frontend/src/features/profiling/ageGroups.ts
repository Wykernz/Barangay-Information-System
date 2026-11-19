export const AGE_GROUPS = [
  { min: 0, max: 5, label: "Early Childhood (0–5 years)" },
  { min: 6, max: 12, label: "Children (6–12 years)" },
  { min: 13, max: 17, label: "Teenagers / Adolescents (13–17 years)" },
  { min: 18, max: 24, label: "Young Adults (18–24 years)" },
  { min: 25, max: 34, label: "Adults (25–34 years)" },
  { min: 35, max: 44, label: "Middle Adults (35–44 years)" },
  { min: 45, max: 59, label: "Older Adults (45–59 years)" },
  { min: 60, max: 74, label: "Senior Citizens (60–74 years)" },
] as const;
/** Completed calendar years at the reporting date; never persisted. */
export function calendarAge(birthdate: string, asOf: string): number | null {
  const birth = new Date(birthdate + "T00:00:00Z");
  const date = new Date(asOf + "T00:00:00Z");
  if (
    !birthdate ||
    !Number.isFinite(+birth) ||
    !Number.isFinite(+date) ||
    +birth > +date
  )
    return null;
  return (
    date.getUTCFullYear() -
    birth.getUTCFullYear() -
    Number(
      date.getUTCMonth() < birth.getUTCMonth() ||
        (date.getUTCMonth() === birth.getUTCMonth() &&
          date.getUTCDate() < birth.getUTCDate()),
    )
  );
}
export function isSenior(birthdate: string, asOf: string): boolean {
  const age = calendarAge(birthdate, asOf);
  return age !== null && age >= 60;
}
export function ageGroups(birthdate: string, asOf: string): string[] {
  const age = calendarAge(birthdate, asOf);
  const group =
    age === null
      ? undefined
      : AGE_GROUPS.find(({ min, max }) => age >= min && age <= max);
  return group ? [group.label] : [];
}
