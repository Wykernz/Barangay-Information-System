/** User-approved descriptive categories, independent of household occupancy. */
export const BUILDING_USES = [
  { value: "Residential", description: "Houses, apartments, boarding houses." },
  {
    value: "Commercial",
    description: "Stores, shops, restaurants, businesses.",
  },
  {
    value: "Mixed-Use",
    description: "A house with a sari-sari store or another business.",
  },
  {
    value: "Institutional",
    description: "Schools, barangay halls, health centers.",
  },
  {
    value: "Other",
    description: "Properties that do not fit the categories above.",
  },
] as const;

export const BUILDING_USE_OPTIONS = [
  "Not recorded",
  ...BUILDING_USES.map(({ value }) => value),
];
