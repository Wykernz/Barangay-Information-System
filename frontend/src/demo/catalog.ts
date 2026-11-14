/** Synthetic UI fixtures only. Domain APIs will replace this adapter later. */
export type RecordRow = { id: string; [field: string]: string };
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
};
export type Module = {
  title: string;
  description: string;
  singular: string;
  fields: Field[];
  rows: RecordRow[];
};
const field = (key: string, label: string, options?: string[]): Field => ({
  key,
  label,
  options,
  required: true,
});
export const catalog: Record<string, Module> = {
  residents: {
    title: "Residents",
    singular: "resident",
    description:
      "Maintain resident profiles and review information that needs verification.",
    fields: [
      field("name", "Full name"),
      { key: "birthdate", label: "Birthdate", type: "date", required: true },
      field("sex", "Sex", ["Female", "Male", "Not recorded"]),
      field("purok", "Purok", ["Demo North", "Demo South"]),
      field("status", "Verification", ["Unverified", "Verified"]),
    ],
    rows: [
      {
        id: "DEMO-R001",
        name: "Sample Resident A",
        birthdate: "1992-06-15",
        sex: "Female",
        purok: "Demo North",
        status: "Verified",
      },
      {
        id: "DEMO-R002",
        name: "Sample Resident B",
        birthdate: "1984-03-20",
        sex: "Male",
        purok: "Demo South",
        status: "Unverified",
      },
      {
        id: "DEMO-R003",
        name: "Sample Resident C",
        birthdate: "2015-09-10",
        sex: "Female",
        purok: "Demo North",
        status: "Verified",
      },
    ],
  },
  households: {
    title: "Households",
    singular: "household",
    description: "Keep family groups distinct from the homes they occupy.",
    fields: [
      field("name", "Household label"),
      field("head", "Head", [
        "Unassigned",
        "Sample Resident A",
        "Sample Resident B",
      ]),
      field("housing", "Housing unit", [
        "Unassigned",
        "DEMO-U001",
        "DEMO-U002",
      ]),
      field("status", "Status", ["Active", "Inactive"]),
    ],
    rows: [
      {
        id: "DEMO-H001",
        name: "Sample Household A",
        head: "Sample Resident A",
        housing: "DEMO-U001",
        status: "Active",
      },
      {
        id: "DEMO-H002",
        name: "Sample Household B",
        head: "Sample Resident B",
        housing: "DEMO-U001",
        status: "Active",
      },
    ],
  },
  housing: {
    title: "Housing units",
    singular: "housing unit",
    description:
      "Record construction, water, and sanitation independently of household membership.",
    fields: [
      field("name", "Unit label"),
      field("material", "Construction", [
        "Concrete",
        "Wood",
        "Mixed",
        "Not recorded",
      ]),
      field("water", "Water source", [
        "Piped",
        "Well",
        "Other",
        "Not recorded",
      ]),
      field("sanitation", "Toilet availability", [
        "Available",
        "Unavailable",
        "Not recorded",
      ]),
      field("status", "Location", ["Unmapped", "Needs verification"]),
    ],
    rows: [
      {
        id: "DEMO-U001",
        name: "Sample Housing Unit A",
        material: "Concrete",
        water: "Piped",
        sanitation: "Available",
        status: "Unmapped",
      },
      {
        id: "DEMO-U002",
        name: "Sample Housing Unit B",
        material: "Mixed",
        water: "Well",
        sanitation: "Not recorded",
        status: "Unmapped",
      },
    ],
  },
  surveys: {
    title: "Household surveys",
    singular: "survey",
    description:
      "Track observations and verification dates without overwriting previous surveys.",
    fields: [
      field("name", "Survey title"),
      field("household", "Household", [
        "Sample Household A",
        "Sample Household B",
      ]),
      {
        key: "observed",
        label: "Observation date",
        type: "date",
        required: true,
      },
      field("status", "Verification", ["Unverified", "Verified"]),
    ],
    rows: [
      {
        id: "DEMO-S001",
        name: "Sample sanitation survey",
        household: "Sample Household A",
        observed: "2026-01-15",
        status: "Unverified",
      },
    ],
  },
  appointments: {
    title: "Appointments",
    singular: "appointment",
    description:
      "Coordinate office visits and follow each request through its staff workflow.",
    fields: [
      field("name", "Resident / visitor"),
      field("service", "Service", ["Document inquiry", "Office consultation"]),
      { key: "date", label: "Appointment date", type: "date", required: true },
      { key: "time", label: "Time", type: "time", required: true },
      field("status", "Status", [
        "Pending",
        "Approved",
        "Rejected",
        "Cancelled",
        "Completed",
        "No-show",
      ]),
    ],
    rows: [
      {
        id: "DEMO-A001",
        name: "Sample Resident A",
        service: "Document inquiry",
        date: "2026-11-20",
        time: "09:00",
        status: "Pending",
      },
      {
        id: "DEMO-A002",
        name: "Sample Resident B",
        service: "Office consultation",
        date: "2026-11-20",
        time: "10:00",
        status: "Approved",
      },
    ],
  },
  cases: {
    title: "Complaints & cases",
    singular: "case",
    description:
      "Synthetic workflow preview. Real case access will require explicit server authorization.",
    fields: [
      field("name", "Case summary"),
      field("category", "Category", ["For review", "Community concern"]),
      field("assigned", "Assigned officer", ["Unassigned", "Demo Officer"]),
      field("status", "Status", [
        "Registered",
        "Under review",
        "Resolved",
        "Withdrawn",
        "Referred",
        "Closed",
      ]),
    ],
    rows: [
      {
        id: "DEMO-C001",
        name: "Synthetic case for interface review",
        category: "For review",
        assigned: "Unassigned",
        status: "Registered",
      },
    ],
  },
  services: {
    title: "Office services",
    singular: "service",
    description:
      "Prepare service availability settings for the appointment module.",
    fields: [
      field("name", "Service name"),
      {
        key: "capacity",
        label: "Daily capacity",
        type: "number",
        required: true,
      },
      { key: "opens", label: "Opens at", type: "time", required: true },
      { key: "closes", label: "Closes at", type: "time", required: true },
      field("status", "Status", ["Active", "Inactive"]),
    ],
    rows: [
      {
        id: "DEMO-V001",
        name: "Document inquiry",
        capacity: "20",
        opens: "08:00",
        closes: "17:00",
        status: "Active",
      },
    ],
  },
  users: {
    title: "Staff & access",
    singular: "staff preview",
    description:
      "Review proposed staff assignments. These demo entries grant no access and create no accounts.",
    fields: [
      field("name", "Display name"),
      field("role", "Proposed role", [
        "Profiling Staff",
        "Appointment Officer",
        "Complaint Officer",
        "Barangay Secretary",
      ]),
      field("status", "Status", ["Active", "Inactive"]),
    ],
    rows: [
      {
        id: "DEMO-P001",
        name: "Demo Profiling Officer",
        role: "Profiling Staff",
        status: "Active",
      },
    ],
  },
};

/** Calculate age at display time rather than storing a value that becomes stale. */
export function ageAt(birthdate: string, today = new Date()): number {
  const [year, month, day] = birthdate.split("-").map(Number);
  return (
    today.getFullYear() -
    year -
    (today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
      ? 1
      : 0)
  );
}
