import type { RecordRow } from "../../demo/catalog";

/** User-supplied demo aliases with fictional attributes, never operational data. */
export const prototypeResidents: RecordRow[] = [
  [
    "001",
    "Adrian Joseph",
    "Bayonon",
    "1981-06-12",
    "Female",
    "Married",
    "Purok 1",
  ],
  ["002", "Renz", "General", "2005-03-19", "Male", "Single", "Purok 1"],
  ["003", "MIko", "Doinog", "2014-02-10", "Female", "Single", "Purok 1"],
  [
    "004",
    "Paul Vincent",
    "Ardidon",
    "1962-11-04",
    "Male",
    "Widowed",
    "Purok 2",
  ],
  ["005", "Zer Jay", "Arabiana", "1990-08-25", "Female", "Single", "Purok 1"],
  ["006", "Darwin", "Mara", "1997-09-30", "Female", "Single", "Purok 3"],
  [
    "007",
    "Juliana Rianne",
    "Ygrubay",
    "",
    "Not recorded",
    "Not recorded",
    "Not recorded",
  ],
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
  ["001", "Adrian Joseph Bayonon", "Purok 1"],
  ["002", "Paul Vincent Ardidon", "Purok 2"],
  ["003", "Zer Jay Arabiana", "Purok 1"],
  ["004", "Darwin Mara", "Purok 3"],
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
