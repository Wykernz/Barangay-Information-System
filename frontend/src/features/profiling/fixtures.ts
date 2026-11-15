import type { RecordRow } from "../../demo/catalog";

/** Fictional records copied from the supplied prototype, never operational data. */
export const prototypeResidents: RecordRow[] = [
  ["001", "Maria", "Santos", "1981-06-12", "Female", "Married", "Purok 1"],
  ["002", "Juan", "Santos", "2005-03-19", "Male", "Single", "Purok 1"],
  ["003", "Rosa", "Santos", "2014-02-10", "Female", "Single", "Purok 1"],
  ["004", "Jose", "Reyes", "1962-11-04", "Male", "Widowed", "Purok 2"],
  ["005", "Ana", "Cruz", "1990-08-25", "Female", "Single", "Purok 1"],
  ["006", "Elena", "Dela Cruz", "1997-09-30", "Female", "Single", "Purok 3"],
].map(([number, firstName, surname, birthdate, sex, civilStatus, purok]) => ({
  id: `DEMO-R${number}`,
  firstName,
  surname,
  name: `${firstName} ${surname}`,
  birthdate,
  sex,
  civilStatus,
  purok,
  status: "Unverified",
}));

export const prototypeHouseholds: RecordRow[] = [
  ["001", "Maria Santos", "Purok 1"],
  ["002", "Jose Reyes", "Purok 2"],
  ["003", "Ana Cruz", "Purok 1"],
  ["004", "Elena Dela Cruz", "Purok 3"],
].map(([number, head, purok]) => ({
  id: `DEMO-H${number}`,
  name: `HH-${number}`,
  head,
  purok,
  housing: `DEMO-U${number}`,
  status: "Active",
}));

// Physical attributes are represented on separate units even though the prototype
// embeds them in households. Its fictional screen coordinates are not imported.
export const prototypeUnits: RecordRow[] = [
  ["001", "Concrete", "Piped water", "Own CR"],
  ["002", "Light materials", "Deep well", "None"],
  ["003", "Semi-concrete", "Communal faucet", "Shared CR"],
  ["004", "Concrete", "Piped water", "Own CR"],
].map(([number, material, water, sanitation]) => ({
  id: `DEMO-U${number}`,
  name: `Housing unit ${number}`,
  material,
  water,
  sanitation,
  status: "Unmapped",
}));
