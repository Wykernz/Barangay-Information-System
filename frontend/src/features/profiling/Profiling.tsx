import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useDemo } from "../../demo/store";
import { ageAt, catalog, type RecordRow } from "../../demo/catalog";
import {
  assign,
  assignFamily,
  ensureHouseholdFamily,
  initialRelationships,
  selectHead,
  type Relationships,
} from "./model";
import "./profiling.css";
import { ProfilePageHeader } from "./components/ProfilePageHeader";
import { ProfileActions } from "./components/ProfileActions";
import { ProfileFeedback } from "./components/ProfileFeedback";
import { ProfileDialog } from "./ProfileDialog";
import { AGE_GROUPS, ageGroups } from "./ageGroups";
import { matchesCategory } from "./categoryFilter";
import { BirthdateInput } from "./components/BirthdateInput";
import { HouseholdMembers } from "./components/HouseholdMembers";
import { BUILDING_USES, BUILDING_USE_OPTIONS } from "./buildingUses";
import { residentError } from "./residentApi";
import { Save } from "lucide-react";
import { ResidentProfileLayout } from "./components/ResidentProfileLayout";
import { ResidentProfileDetails } from "./components/ResidentProfileDetails";

const Context = createContext<{
  state: Relationships;
  change: (next: Relationships) => void;
} | null>(null);
export function ProfilingProvider({ children }: { children: ReactNode }) {
  // Relationship segments are independent of profile rows and live for this login session.
  const [state, change] = useState(initialRelationships);
  return (
    <Context.Provider value={{ state, change }}>{children}</Context.Provider>
  );
}
function useProfiling() {
  const value = useContext(Context);
  if (!value) throw Error("Missing profiling provider");
  return value;
}
// Effective dates follow the barangay's local calendar, not the browser's timezone.
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
const display = (row: RecordRow) =>
  row.surname ? `${row.surname}, ${row.firstName}` : row.name;
const sorted = (rows: RecordRow[]) =>
  [...rows].sort((a, b) => display(a).localeCompare(display(b)));

/** Profiling has its own routes and state; the generic editor remains untouched. */
export function ProfilingPage({
  module,
  databaseOnly = false,
}: {
  module: string;
  databaseOnly?: boolean;
}) {
  const { records, save, saveResident, residentLoadError } = useDemo();
  const { state, change } = useProfiling();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [purokFilter, setPurokFilter] = useState("");
  const [recordStatusFilter, setRecordStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [buildingUseFilter, setBuildingUseFilter] = useState("");
  useEffect(() => {
    const value = params.get("classification");
    setClassificationFilter(
      value === "Resident" || value === "Non-resident" ? value : "",
    );
  }, [params]);
  const [draft, setDraft] = useState<RecordRow | null>(null);
  const [photo, setPhoto] = useState<File>();
  const [photoPreview, setPhotoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [candidate, setCandidate] = useState("");
  const [effective, setEffective] = useState(today);
  const [action, setAction] = useState<"end" | "head" | null>(null);
  const [removing, setRemoving] = useState<RecordRow | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [unit, setUnit] = useState("");
  const [moving, setMoving] = useState(false);
  const foundRecord = records[module].find((row) => row.id === id);
  const current =
    module === "residents" &&
    databaseOnly &&
    foundRecord?._storage !== "database"
      ? undefined
      : foundRecord;
  const memberships = state.memberships.filter((item) => !item.end);
  const householdMembers = memberships.filter(
    (item) => item.householdId === id,
  );
  const databaseResidents = records.residents.filter(
    (row) => row._storage === "database",
  );
  const directoryResidents = databaseOnly
    ? databaseResidents
    : records.residents;
  // Use one filtered collection for rows and empty states, including archive visibility.
  const visibleRows = sorted(records[module]).filter(
    (row) =>
      (module !== "residents" ||
        !databaseOnly ||
        row._storage === "database") &&
      (showArchived || row.archived !== "true") &&
      matchesCategory(row, params.get("category") ?? "", today()) &&
      (module !== "housing" ||
        !buildingUseFilter ||
        (row.buildingUse || "Not recorded") === buildingUseFilter) &&
      (module !== "residents" ||
        !classificationFilter ||
        row.residencyClassification === classificationFilter) &&
      (module !== "residents" || !purokFilter || row.purok === purokFilter) &&
      (module !== "residents" ||
        !recordStatusFilter ||
        (row.recordStatus || "Not recorded") === recordStatusFilter) &&
      `${display(row)} ${row.middleName ?? ""} ${row.id} ${row.personId ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visibleRows.slice((currentPage - 1) * 10, currentPage * 10);
  const puroks = [
    ...new Set(directoryResidents.map((row) => row.purok).filter(Boolean)),
  ].sort();
  const recordStatuses = [
    ...new Set(
      directoryResidents.map((row) => row.recordStatus || "Not recorded"),
    ),
  ].sort();
  const returnHousehold = params.get("household");
  const returnFamily = params.get("family");
  const unitFor = (householdId: string) =>
    records.housing.find(
      (row) =>
        row.id ===
        state.occupancies.find(
          (item) => item.householdId === householdId && !item.end,
        )?.unitId,
    );
  const householdHead = (householdId: string) =>
    records.residents.find(
      (row) =>
        row.id ===
        memberships.find(
          (item) => item.householdId === householdId && item.head,
        )?.residentId,
    )?.name ?? "Not assigned";
  // Household-context entry points open registration directly, like the reference.
  useEffect(() => {
    if (!id && returnHousehold) edit();
    if (id && params.get("edit") === "1" && current) edit(current);
  }, [module, id, returnHousehold, params.get("edit"), current?.id]);
  function edit(row?: RecordRow) {
    setPhoto(undefined);
    setError("");
    setMessage("");
    setDraft(
      row
        ? { ...row }
        : {
            id: `DEMO-${crypto.randomUUID()}`,
            ...(module === "residents"
              ? { recordStatus: "Active", residencyStatus: "Not recorded" }
              : {}),
            ...Object.fromEntries(
              catalog[module].fields.map((field) => [
                field.key,
                field.options?.[0] ?? "",
              ]),
            ),
            ...(module === "residents"
              ? {
                  sex: "Not recorded",
                  purok: "Not recorded",
                  residencyClassification: "Not recorded",
                  residencyStatus: "Not recorded",
                  civilStatus: "Not recorded",
                }
              : {}),
          },
    );
    // Existing synthetic names are split only as initial form values; staff can correct them.
    if (module === "residents" && row && !row.surname) {
      const words = row.name.split(" ");
      setDraft({
        ...row,
        surname: words.pop() ?? "",
        firstName: words.join(" "),
        civilStatus: row.civilStatus ?? "Not recorded",
      });
    }
    if (!row && returnHousehold)
      setDraft((value) =>
        value
          ? {
              ...value,
              householdId: returnHousehold,
              targetHousehold: returnHousehold,
              targetFamily:
                returnFamily ??
                ((state.families ?? []).filter(
                  (family) => family.householdId === returnHousehold,
                ).length === 1
                  ? (state.families?.find(
                      (family) => family.householdId === returnHousehold,
                    )?.id ?? "")
                  : ""),
            }
          : value,
      );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    // Validate the draft and compute relationship changes before applying UI state.
    // This adapter is not a database transaction; the backend contract requires one.
    event.preventDefault();
    if (!draft || saving) return;
    if (
      module === "housing" &&
      !BUILDING_USE_OPTIONS.includes(draft.buildingUse || "Not recorded")
    ) {
      setError("Choose a listed building use.");
      return;
    }
    if (
      module === "residents" &&
      (!draft.firstName?.trim() ||
        !draft.surname?.trim() ||
        (isRequiredBirthdate(draft) && !draft.birthdate) ||
        (!!draft.birthdate && draft.birthdate > today()))
    ) {
      setError(
        "Enter first name and surname, and provide a valid birthdate for a new resident.",
      );
      return;
    }
    const missing = fields.filter((field) => {
      if (!isRequiredField(field, draft)) return false;
      const value =
        draft[field.key] ?? ("options" in field ? field.options?.[0] : "");
      return !value?.trim() || value === "Choose classification";
    });
    if (missing.length) {
      setError(
        `Complete required fields: ${missing.map((field) => field.label).join(", ")}.`,
      );
      return;
    }
    if (!event.currentTarget.reportValidity()) return;
    const row =
      module === "residents"
        ? {
            ...draft,
            name: `${draft.firstName.trim()} ${draft.surname.trim()}`,
          }
        : draft;
    if (module === "surveys") {
      const householdId = draft.householdId || returnHousehold;
      if (
        !householdId ||
        !records.households.some((item) => item.id === householdId)
      ) {
        setError("Choose an existing household.");
        return;
      }
      row.householdId = householdId;
      row.household = records.households.find(
        (item) => item.id === householdId,
      )!.name;
    }
    let next =
      module === "households" ? ensureHouseholdFamily(state, draft.id) : state;
    if (module === "residents" && draft.targetHousehold) {
      if (
        !records.households.some(
          (item) =>
            item.id === draft.targetHousehold && item.archived !== "true",
        )
      ) {
        setError("Choose an active household.");
        return;
      }
      const existing = memberships.find((item) => item.residentId === draft.id);
      // A relationship edit within the same household must also supersede its
      // membership segment; otherwise the form appeared to save but lost the edit.
      if (
        existing?.householdId !== draft.targetHousehold ||
        (draft.relationship &&
          draft.relationship !==
            (existing.head ? "Head" : existing.relationship))
      )
        next = assign(
          next,
          draft.id,
          draft.targetHousehold,
          draft.relationship || "Member",
          today(),
          crypto.randomUUID(),
        );
      if (draft.relationship === "Head") {
        const head = next.memberships.find(
          (item) =>
            !item.end &&
            item.householdId === draft.targetHousehold &&
            item.head &&
            item.residentId !== draft.id,
        );
        if (head) {
          setError(
            "This household already has a head. Change its head from household details.",
          );
          return;
        }
        next = selectHead(next, draft.targetHousehold, draft.id, today());
      }
    }
    if (module === "residents" && draft.targetFamily !== undefined) {
      const member = next.memberships.find(
        (item) =>
          item.residentId === draft.id &&
          !item.end &&
          item.householdId ===
            (draft.targetHousehold ||
              memberships.find(
                (membership) => membership.residentId === draft.id,
              )?.householdId),
      );
      try {
        if (!member && draft.targetFamily)
          throw new Error("Choose this household before assigning its family.");
        if (member)
          next = assignFamily(
            next,
            member.id,
            draft.targetFamily || undefined,
            today(),
            crypto.randomUUID(),
          );
      } catch (caught) {
        setError((caught as Error).message);
        return;
      }
    }
    if (module === "households" && draft.headId) {
      const existing = memberships.find(
        (item) => item.residentId === draft.headId,
      );
      if (existing && existing.householdId !== draft.id) {
        setError("Choose an unassigned resident or a current member as head.");
        return;
      }
      if (!existing)
        next = assign(
          next,
          draft.headId,
          draft.id,
          "Member",
          today(),
          crypto.randomUUID(),
        );
      next = selectHead(next, draft.id, draft.headId, today());
    }
    if (
      module === "households" &&
      draft.unitId &&
      !state.occupancies.some(
        (item) =>
          !item.end &&
          item.householdId === draft.id &&
          item.unitId === draft.unitId,
      )
    ) {
      next = {
        ...next,
        occupancies: [
          ...next.occupancies.map((item) =>
            !item.end && item.householdId === draft.id
              ? { ...item, end: today() }
              : item,
          ),
          {
            id: crypto.randomUUID(),
            householdId: draft.id,
            unitId: draft.unitId,
            start: today(),
            end: null,
          },
        ],
      };
    }
    // Temporary form selections are relationships, not duplicated resident fields.
    delete row.targetHousehold;
    delete row.targetFamily;
    delete row.relationship;
    delete row.headId;
    delete row.unitId;
    let saved = row;
    if (
      module === "residents" &&
      saveResident &&
      (row._storage === "database" ||
        !records.residents.some((item) => item.id === row.id))
    ) {
      setSaving(true);
      try {
        saved = await saveResident(row, photo);
        next = {
          ...next,
          memberships: next.memberships.map((item) =>
            item.residentId === row.id
              ? { ...item, residentId: saved.id }
              : item,
          ),
        };
      } catch (caught) {
        setError(residentError(caught));
        return;
      } finally {
        setSaving(false);
      }
    }
    change(next);
    save(module, saved);
    setDraft(null);
    setPhoto(undefined);
    setMessage(
      saved._storage === "database"
        ? "Resident profile saved to the database. Household and family assignments remain session only."
        : "Profile updated in this session.",
    );
    if (!id)
      navigate(
        module === "residents" && returnHousehold
          ? `/households/${returnHousehold}`
          : `/${module}/${saved.id}`,
      );
  }
  function confirmAction() {
    try {
      if (!effective || effective > today())
        throw Error("Choose an effective date on or before today.");
      let next =
        action === "head"
          ? selectHead(state, id!, candidate, effective)
          : assign(
              state,
              candidate,
              null,
              "Member",
              effective,
              crypto.randomUUID(),
            );
      change(next);
      setAction(null);
      setMessage("Membership updated. Previous assignments remain in history.");
      setError("");
    } catch (caught) {
      setError((caught as Error).message);
    }
  }
  const fields =
    module === "residents"
      ? [
          { key: "firstName", label: "First name" },
          { key: "surname", label: "Surname" },
          { key: "middleName", label: "Middle name", optional: true },
          { key: "suffix", label: "Suffix", optional: true },
          { key: "nationality", label: "Nationality", optional: true },
          { key: "placeOfBirth", label: "Place of birth", optional: true },
          {
            key: "contactNumber",
            label: "Contact number",
            type: "tel",
            optional: true,
          },
          {
            key: "email",
            label: "Email address",
            type: "email",
            optional: true,
          },
          {
            key: "residencyStatus",
            label: "Residency status",
            optional: true,
            options: [
              "Not recorded",
              "Permanent resident",
              "Renter",
              "Boarder",
              "Other",
            ],
          },
          {
            key: "recordStatus",
            label: "Record status",
            optional: true,
            options: ["Not recorded", "Active", "Moved out", "Deceased"],
          },
          {
            key: "lgbtIdentification",
            label: "LGBT identification (voluntary)",
            options: ["Not recorded", "Yes", "No", "Prefer not to say"],
          },
          {
            key: "pwdStatus",
            label: "PWD status",
            options: ["Not recorded", "Yes", "No", "Prefer not to say"],
          },
          {
            key: "residencyClassification",
            label: "Residency classification",
            optional: true,
            options: ["Not recorded", "Resident", "Non-resident"],
          },
          ...catalog.residents.fields
            .filter((field) => field.key !== "name")
            .map((field) =>
              field.key === "purok"
                ? {
                    ...field,
                    optional: true,
                    options: ["Purok 1", "Purok 2", "Purok 3", "Not recorded"],
                  }
                : field.key === "birthdate"
                  ? field
                  : { ...field, optional: true },
            ),
          {
            key: "civilStatus",
            label: "Civil status",
            optional: true,
            options: [
              "Not recorded",
              "Single",
              "Married",
              "Widowed",
              "Separated",
              "Other",
            ],
          },
        ].filter(
          (field) =>
            !saveResident ||
            !["lgbtIdentification", "pwdStatus", "status"].includes(field.key),
        )
      : [
          ...catalog[module].fields
            .filter(
              (field) => !["head", "housing", "household"].includes(field.key),
            )
            .map((field) =>
              module === "housing" && field.key === "material"
                ? {
                    ...field,
                    options: [
                      "Concrete",
                      "Semi-concrete",
                      "Light materials",
                      "Wood",
                      "Mixed",
                      "Other",
                      "Not recorded",
                    ],
                  }
                : module === "housing" && field.key === "water"
                  ? {
                      ...field,
                      options: [
                        "Piped water",
                        "Deep well",
                        "Communal faucet",
                        "Spring",
                        "Other",
                        "Not recorded",
                      ],
                    }
                  : module === "housing" && field.key === "sanitation"
                    ? {
                        ...field,
                        options: [
                          "Own CR",
                          "Shared CR",
                          "None",
                          "Not recorded",
                        ],
                      }
                    : field,
            ),
          ...(module === "housing"
            ? [{ key: "houseNumber", label: "House number", optional: true }]
            : []),
          ...(module === "households"
            ? [
                {
                  key: "purok",
                  label: "Purok",
                  options: ["Purok 1", "Purok 2", "Purok 3", "Not recorded"],
                },
                {
                  key: "surveyDate",
                  label: "Survey date",
                  type: "date",
                  optional: true,
                },
                {
                  key: "waterSupply",
                  label: "Water source",
                  options: Array.from(
                    new Set([
                      "Not recorded",
                      "Piped water",
                      "Communal faucet",
                      "Deep well",
                      "Shallow well",
                      "Spring",
                      "Rainwater",
                      "Delivered water",
                      "Bottled / refilling station",
                      "Other",
                      ...(draft?.waterSupply ? [draft.waterSupply] : []),
                    ]),
                  ),
                },
                {
                  key: "septicTank",
                  label: "Does this household have a septic tank?",
                  options: ["Not recorded", "Yes", "None"],
                },
              ]
            : []),
        ];
  function isExistingResident(draft: RecordRow) {
    return (
      draft._storage === "database" ||
      records.residents.some((resident) => resident.id === draft.id)
    );
  }
  function isRequiredBirthdate(draft: RecordRow) {
    const saved = records.residents.find((resident) => resident.id === draft.id);
    return (
      !isExistingResident(draft) || Boolean(saved?.birthdate || draft.birthdate)
    );
  }
  function isRequiredField(field: (typeof fields)[number], draft: RecordRow) {
    if (module !== "residents")
      return !("optional" in field && field.optional);
    if (["firstName", "surname"].includes(field.key)) return true;
    if (field.key === "birthdate") return isRequiredBirthdate(draft);
    return false;
  }
  function renderProfileField(field: (typeof fields)[number]) {
    if (!draft) return null;
    const required = isRequiredField(field, draft);
    return (
      <label
        key={field.key}
        className={`person-field person-field--${field.key}${required ? " person-field-required" : ""}`}
      >
        <span className="person-field-label">{field.label}</span>
        {"options" in field && field.options ? (
          <select
            required={required}
            aria-label={field.label}
            value={draft[field.key] ?? field.options[0]}
            aria-describedby={
              field.key === "buildingUse"
                ? "building-use-help"
                : field.key === "residencyClassification"
                  ? "residency-requirement"
                  : undefined
            }
            onChange={(event) =>
              setDraft({
                ...draft,
                [field.key]: event.target.value,
              })
            }
          >
            {field.options.map((option) => (
              <option
                key={option}
                value={option === "Choose classification" ? "" : option}
              >
                {option}
              </option>
            ))}
          </select>
        ) : field.key === "birthdate" ? (
          <BirthdateInput
            value={draft.birthdate ?? ""}
            max={today()}
            required={required}
            onChange={(value) => setDraft({ ...draft, birthdate: value })}
          />
        ) : (
          <input
            required={required}
            type={"type" in field ? field.type : "text"}
            maxLength={
              (
                {
                  houseNumber: 50,
                  firstName: 100,
                  surname: 100,
                  middleName: 100,
                  suffix: 30,
                  nationality: 100,
                  contactNumber: 50,
                  email: 254,
                } as Record<string, number>
              )[field.key] ?? 150
            }
            value={draft[field.key] ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                [field.key]: event.target.value,
              })
            }
          />
        )}
        {field.key === "buildingUse" && (
          <small id="building-use-help">
            {BUILDING_USES.find(({ value }) => value === draft.buildingUse)
              ?.description ??
              "Choose how this building is used. Leave Not recorded if unknown."}
          </small>
        )}
        {field.key === "residencyClassification" && (
          <small id="residency-requirement">
            Choose Resident or Non-resident when known. Otherwise leave this as
            Not recorded.
          </small>
        )}
      </label>
    );
  }
  async function updateArchive(row: RecordRow, archived: boolean) {
    const updated = { ...row, archived: String(archived) };
    if (module === "residents" && row._storage === "database" && saveResident) {
      try {
        save(module, await saveResident(updated));
      } catch (caught) {
        setError(residentError(caught));
        return false;
      }
    } else save(module, updated);
    return true;
  }
  async function remove() {
    // "Delete" archives a profile. Active dependants block removal and historical
    // memberships/occupancies remain available for review; restore does not reopen them.
    if (!removing) return;
    if (
      module === "households" &&
      memberships.some((item) => item.householdId === removing.id)
    ) {
      setError("Unassign or transfer household members before removal.");
      return;
    }
    if (
      module === "housing" &&
      state.occupancies.some((item) => item.unitId === removing.id && !item.end)
    ) {
      setError("Move occupying households before removing this housing unit.");
      return;
    }
    let next = state;
    if (module === "residents")
      next = assign(
        next,
        removing.id,
        null,
        "Member",
        today(),
        crypto.randomUUID(),
      );
    if (module === "households")
      next = {
        ...next,
        occupancies: next.occupancies.map((item) =>
          item.householdId === removing.id && !item.end
            ? { ...item, end: today() }
            : item,
        ),
      };
    if (module === "residents" && removing._storage === "database") {
      if (!(await updateArchive(removing, true))) return;
    } else save(module, { ...removing, archived: "true" });
    change(next);
    setRemoving(null);
    navigate(`/${module}`);
    setMessage(
      "Record removed from the active directory. History retained in archived records.",
    );
  }
  if (module === "residents" && draft)
    return (
      <div className="profiling person-profile-screen">
        <ProfileDialog
          personProfile
          title={`${records.residents.some((row) => row.id === draft.id) ? "Edit" : "Register"} resident`}
          close={() => {
            if (!saving) setDraft(null);
          }}
        >
          <form onSubmit={submit}>
            <fieldset disabled={saving} className="person-form-fieldset">
              <ResidentProfileLayout
                draft={draft}
                existing={records.residents.some((row) => row.id === draft.id)}
                fields={Object.fromEntries(
                  fields.map((field) => [field.key, renderProfileField(field)]),
                )}
                photoUrl={photoPreview || draft.photoUrl || ""}
                photoName={photo?.name}
                photoDisabled={
                  !saveResident ||
                  (draft._storage !== "database" &&
                    records.residents.some((row) => row.id === draft.id))
                }
                onPhotoChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && file.size > 5 * 1024 * 1024) {
                    setError("Photo must be at most 5 MiB.");
                    event.target.value = "";
                    setPhoto(undefined);
                    return;
                  }
                  setError("");
                  setPhoto(file);
                }}
                ageSummary={
                  draft.birthdate && (
                    <>
                      Calculated age: {ageAt(draft.birthdate)} years. Age
                      groups:{" "}
                      {ageGroups(draft.birthdate, today()).join(", ") ||
                        "No listed age group"}
                      . Calculated automatically from birthdate.
                    </>
                  )
                }
              >
                <label>
                  Household
                  <select
                    value={
                      draft.targetHousehold ??
                      memberships.find((item) => item.residentId === draft.id)
                        ?.householdId ??
                      ""
                    }
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        targetHousehold: event.target.value,
                        targetFamily: "",
                      })
                    }
                  >
                    <option value="">Unassigned / retain current</option>
                    {records.households
                      .filter((row) => row.archived !== "true")
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Family
                  <select
                    value={
                      draft.targetFamily ??
                      memberships.find((item) => item.residentId === draft.id)
                        ?.familyId ??
                      ""
                    }
                    onChange={(event) =>
                      setDraft({ ...draft, targetFamily: event.target.value })
                    }
                  >
                    <option value="">Not assigned to a family</option>
                    {(state.families ?? [])
                      .filter(
                        (family) =>
                          family.householdId ===
                          (draft.targetHousehold ||
                            memberships.find(
                              (item) => item.residentId === draft.id,
                            )?.householdId),
                      )
                      .map((family) => (
                        <option key={family.id} value={family.id}>
                          {family.label}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Relationship
                  <select
                    value={draft.relationship ?? "Member"}
                    onChange={(event) =>
                      setDraft({ ...draft, relationship: event.target.value })
                    }
                  >
                    {[
                      "Member",
                      "Head",
                      "Spouse",
                      "Son",
                      "Daughter",
                      "Parent",
                      "Sibling",
                      "Other",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </ResidentProfileLayout>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <div className="profile-form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setDraft(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button disabled={saving}>
                  <Save size={17} aria-hidden="true" />
                  {saving ? "Saving…" : "Save profile"}
                </button>
              </div>
            </fieldset>
          </form>
        </ProfileDialog>
      </div>
    );
  return (
    <div className="profiling">
      <ProfilePageHeader
        module={module}
        title={
          current && module === "residents"
            ? "Person Profile"
            : current
              ? display(current)
              : catalog[module].title
        }
        singular={catalog[module].singular}
        detail={!!current}
        disabled={!!id && !current}
        edit={() => edit(current)}
      />
      {id && (
        <Link
          to={
            module === "residents" && returnHousehold
              ? `/households/${encodeURIComponent(returnHousehold)}`
              : `/${module}`
          }
        >
          ←{" "}
          {returnHousehold && module === "residents"
            ? "Back to household"
            : "Back to directory"}
        </Link>
      )}
      {id && !current && (
        <p role="alert">Record not found. Return to the directory.</p>
      )}
      {message && <ProfileFeedback message={message} />}
      {module === "residents" && databaseOnly && !id && saveResident && (
        <p className="notice">
          This directory shows database resident records. Session-only
          presentation samples are excluded.
        </p>
      )}
      {module === "residents" && residentLoadError && (
        <p role="alert" className="error">
          {residentLoadError}
        </p>
      )}
      {error && !action && <ProfileFeedback message={error} error />}
      {!id && (
        <section className="panel">
          <div className="registry-section-heading">
            <div>
              <h2>{catalog[module].title} registry</h2>
              <p className="muted">
                Search records and open a profile to manage its details.
              </p>
            </div>
            <span className="profile-count">
              {
                (module === "residents" && databaseOnly
                  ? databaseResidents
                  : records[module]
                ).filter((row) => row.archived !== "true").length
              }{" "}
              active records
            </span>
          </div>
          <div className="profile-toolbar">
            {params.get("category") && (
              <div role="status">
                Filtered: {params.get("category")}{" "}
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete("category");
                    setParams(next);
                  }}
                >
                  Clear category
                </button>
              </div>
            )}
            <label>
              Search {catalog[module].title.toLowerCase()}
              <input
                placeholder="Name or reference number"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            {module === "residents" && (
              <label>
                Filter by residency
                <select
                  value={classificationFilter}
                  onChange={(event) =>
                    setClassificationFilter(event.target.value)
                  }
                >
                  <option value="">All classifications</option>
                  <option value="Resident">Resident</option>
                  <option value="Non-resident">Non-resident</option>
                </select>
              </label>
            )}
            {module === "residents" && (
              <>
                <label>
                  Filter by purok
                  <select
                    value={purokFilter}
                    onChange={(event) => {
                      setPurokFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All puroks</option>
                    {puroks.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Filter by record status
                  <select
                    value={recordStatusFilter}
                    onChange={(event) => {
                      setRecordStatusFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All statuses</option>
                    {recordStatuses.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {module === "housing" && (
              <label>
                Filter by building use
                <select
                  value={buildingUseFilter}
                  onChange={(event) => setBuildingUseFilter(event.target.value)}
                >
                  <option value="">All building uses</option>
                  {BUILDING_USE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="archive-filter">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              Show archived records
            </label>
          </div>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">
                {catalog[module].title} registry with profile actions
              </caption>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">
                    {module === "residents"
                      ? "Surname"
                      : module === "households"
                        ? "Household"
                        : "Name"}
                  </th>
                  {module === "residents" && <th scope="col">First name</th>}
                  {module === "residents" && (
                    <>
                      <th scope="col">Age</th>
                      <th scope="col">Sex</th>
                      <th scope="col">Residency</th>
                      <th scope="col">Household</th>
                    </>
                  )}
                  {module === "households" && (
                    <>
                      <th scope="col">Head</th>
                      <th scope="col">Purok</th>
                      <th scope="col">Members</th>
                      <th scope="col">Housing</th>
                    </>
                  )}
                  {module === "housing" && <th scope="col">Building use</th>}
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const member = memberships.find(
                    (item) => item.residentId === row.id,
                  );
                  const head = memberships.find(
                    (item) => item.householdId === row.id && item.head,
                  );
                  return (
                    <tr key={row.id}>
                      <td>
                        {row.personId || row.id}
                        {module === "residents" && saveResident && (
                          <small className="muted" style={{ display: "block" }}>
                            {row._storage === "database"
                              ? "Database"
                              : "Local sample"}
                          </small>
                        )}
                      </td>
                      <td>
                        {module === "residents" ? row.surname : display(row)}
                        {row.archived === "true" && (
                          <span className="archived-label">Archived</span>
                        )}
                      </td>
                      {module === "residents" && <td>{row.firstName}</td>}
                      {module === "residents" && (
                        <>
                          <td>{ageAt(row.birthdate)}</td>
                          <td>{row.sex}</td>
                          <td>
                            <span className="badge">
                              {row.residencyClassification ?? "Not classified"}
                            </span>
                          </td>
                          <td>
                            {member ? (
                              <Link to={`/households/${member.householdId}`}>
                                {records.households.find(
                                  (house) => house.id === member.householdId,
                                )?.name ?? member.householdId}
                              </Link>
                            ) : (
                              "Unassigned"
                            )}
                          </td>
                        </>
                      )}
                      {module === "households" && (
                        <>
                          <td>
                            {records.residents.find(
                              (person) => person.id === head?.residentId,
                            )?.name ?? "Unassigned"}
                          </td>
                          <td>{row.purok ?? "Not recorded"}</td>
                          <td>
                            {
                              memberships.filter(
                                (item) => item.householdId === row.id,
                              ).length
                            }
                          </td>
                          <td>{unitFor(row.id)?.material ?? "Not assigned"}</td>
                        </>
                      )}
                      {module === "housing" && (
                        <td>
                          <span className="badge">
                            {row.buildingUse || "Not recorded"}
                          </span>
                        </td>
                      )}
                      <td>
                        <ProfileActions
                          to={`/${module}/${row.id}`}
                          name={display(row)}
                          archived={row.archived === "true"}
                          edit={() => edit(row)}
                          remove={() => {
                            setError("");
                            setRemoving(row);
                          }}
                          restore={() => void updateArchive(row, false)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <nav className="registry-pagination" aria-label="Registry pages">
              <button
                className="secondary"
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <button
                className="secondary"
                type="button"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </nav>
          )}
          {!visibleRows.length && (
            <p className="profile-empty">
              No matching records. Try another search or show archived records.
            </p>
          )}
        </section>
      )}
      {current && module === "residents" && (
        <section className="resident-view-page">
          <ResidentProfileDetails
            resident={current}
            relationship={
              memberships.find((item) => item.residentId === current.id)
                ?.relationship ?? "Unassigned"
            }
          />
          <div className="resident-view-actions">
            {current.archived === "true" ? (
              <p className="notice">
                Archived record. Restore it from the directory before active
                use.
              </p>
            ) : (
              <button
                className="secondary danger"
                onClick={() => {
                  setError("");
                  setRemoving(current);
                }}
              >
                Archive resident
              </button>
            )}
          </div>
          <section
            className="resident-view-history"
            aria-label="Household memberships"
          >
            <h2>Household memberships</h2>
            {state.memberships.filter((item) => item.residentId === id)
              .length ? (
              state.memberships
                .filter((item) => item.residentId === id)
                .map((item) => (
                  <p key={item.id}>
                    <Link to={`/households/${item.householdId}`}>
                      {item.householdId}
                    </Link>{" "}
                    · {item.head ? "Head" : item.relationship} · {item.start} →{" "}
                    {item.end ?? "Current"}
                  </p>
                ))
            ) : (
              <p>No household membership recorded.</p>
            )}
          </section>
        </section>
      )}
      {current && module !== "residents" && (
        <section className="panel">
          {module === "residents" && (
            <div className="profile-identity">
              {current.photoUrl && (
                <img
                  src={current.photoUrl}
                  alt="Resident profile"
                  width={96}
                  height={96}
                  style={{ objectFit: "cover", borderRadius: 8 }}
                />
              )}
              <span className="profile-initials" aria-hidden="true">
                {current.firstName?.[0]}
                {current.surname?.[0]}
              </span>
              <div>
                <h2>{current.name}</h2>
                {saveResident && (
                  <small>
                    {current._storage === "database"
                      ? "Database record"
                      : "Local sample · session only"}
                  </small>
                )}
                <p className="muted">
                  {memberships.find((item) => item.residentId === current.id)
                    ?.relationship ?? "Unassigned"}
                </p>
              </div>
            </div>
          )}
          {module !== "households" &&
            (current.archived === "true" ? (
              <p className="notice">
                Archived record. Restore it from the directory before active
                use.
              </p>
            ) : (
              <button
                className="secondary danger"
                onClick={() => {
                  setError("");
                  setRemoving(current);
                }}
              >
                Delete {catalog[module].singular}
              </button>
            ))}
          <h2>
            {module === "households"
              ? "Household information"
              : "Profile details"}
          </h2>
          {module !== "households" && (
            <dl className="profile-details">
              {module === "residents" && (
                <div>
                  <dt>Age</dt>
                  <dd>
                    {ageAt(current.birthdate)} (calculated from birthdate)
                  </dd>
                </div>
              )}
              {Object.entries(
                module === "housing"
                  ? {
                      ...current,
                      houseNumber: current.houseNumber || "Not numbered",
                      buildingUse: current.buildingUse || "Not recorded",
                    }
                  : current,
              )
                .filter(
                  ([key]) =>
                    !["head", "housing", "photoUrl", "_storage"].includes(key),
                )
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {fields.find((field) => field.key === key)?.label ??
                        (
                          {
                            id: "Reference",
                            name: "Name",
                            household: "Household",
                            householdId: "Household reference",
                            archived: "Archived",
                            personId: "Person ID",
                            registrationDate: "Date of registration",
                          } as Record<string, string>
                        )[key] ??
                        key}
                    </dt>
                    <dd>{value || "Not recorded"}</dd>
                  </div>
                ))}
            </dl>
          )}
          {module === "households" && (
            <>
              <dl className="profile-details household-summary household-quick-facts">
                <div>
                  <dt>House number</dt>
                  <dd>{unitFor(current.id)?.houseNumber || "Not numbered"}</dd>
                </div>
                <div>
                  <dt>Household head</dt>
                  <dd>{householdHead(current.id)}</dd>
                </div>
                <div>
                  <dt>Members</dt>
                  <dd>{householdMembers.length}</dd>
                </div>
                <div>
                  <dt>Families</dt>
                  <dd>
                    {
                      (state.families ?? []).filter(
                        (family) => family.householdId === current.id,
                      ).length
                    }
                  </dd>
                </div>
                <div>
                  <dt>Purok</dt>
                  <dd>{current.purok || "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Housing unit</dt>
                  <dd>
                    {unitFor(current.id) ? (
                      <Link to={`/housing/${unitFor(current.id)!.id}`}>
                        {unitFor(current.id)!.name}
                      </Link>
                    ) : (
                      "Not assigned"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className="badge positive">
                      {current.status || "Not recorded"}
                    </span>
                  </dd>
                </div>
              </dl>
              <details className="household-secondary-panel">
                <summary>
                  Water, sanitation & survey details
                  <span>View household and housing observations</span>
                </summary>
                <dl className="profile-details household-summary">
                  {[
                    ["Survey date", current.surveyDate || "Not recorded"],
                    ["Water source", current.waterSupply || "Not recorded"],
                    ["Septic tank", current.septicTank || "Not recorded"],
                    [
                      "Building use",
                      unitFor(current.id)?.buildingUse || "Not recorded",
                    ],
                    [
                      "Housing material",
                      unitFor(current.id)?.material || "Not recorded",
                    ],
                    [
                      "Toilet / CR",
                      unitFor(current.id)?.sanitation || "Not recorded",
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </>
          )}
          {module === "residents" && (
            <>
              <p>Age: {ageAt(current.birthdate)}</p>
              <p>
                Age groups:{" "}
                {ageGroups(current.birthdate, today()).join(", ") ||
                  "No listed age group / birthdate unavailable"}
              </p>
              <p>
                Residency classification:{" "}
                {current.residencyClassification ?? "Not classified"}
              </p>
              <h3>Household memberships</h3>
              {state.memberships
                .filter((item) => item.residentId === id)
                .map((item) => (
                  <p key={item.id}>
                    <Link to={`/households/${item.householdId}`}>
                      {item.householdId}
                    </Link>{" "}
                    · {item.head ? "Head" : item.relationship} · {item.start} →{" "}
                    {item.end ?? "Current"}
                  </p>
                ))}
              <p>
                Sensitive health information is excluded from this general
                profile.
              </p>
            </>
          )}
        </section>
      )}
      {current && module === "households" && (
        <>
          <HouseholdMembers
            key={current.id}
            householdId={current.id}
            residents={records.residents}
            households={records.households}
            state={state}
            date={today()}
            archived={current.archived === "true"}
            update={(next, notice) => {
              change(next);
              setMessage(notice);
              setError("");
            }}
            onAction={(nextAction, residentId) => {
              setCandidate(residentId);
              setEffective(today());
              setError("");
              setAction(nextAction);
            }}
          />
          <details className="panel household-secondary-panel">
            <summary>
              Age-group summary<span>View age counts for current members</span>
            </summary>{" "}
            {module === "households" && (
              <section aria-label="Household demographic summary">
                <h3>Household demographic summary</h3>
                <p>
                  Current members only. Age bands are mutually exclusive;
                  birthdates determine the counts.
                </p>
                <dl className="profile-details">
                  {AGE_GROUPS.map(({ label }) => label).map((group) => (
                    <div key={group}>
                      <dt>{group}</dt>
                      <dd>
                        {
                          householdMembers.filter((member) => {
                            const person = records.residents.find(
                              (row) => row.id === member.residentId,
                            );
                            return (
                              person &&
                              ageGroups(person.birthdate, today()).includes(
                                group,
                              )
                            );
                          }).length
                        }
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt>Birthdate missing</dt>
                    <dd>
                      {
                        householdMembers.filter(
                          (member) =>
                            !records.residents.find(
                              (row) => row.id === member.residentId,
                            )?.birthdate,
                        ).length
                      }
                    </dd>
                  </div>
                </dl>
              </section>
            )}
          </details>
          <details className="panel household-secondary-panel">
            <summary>
              Membership history
              <span>View family changes and previous assignments</span>
            </summary>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">
                  Household membership history
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Relationship</th>
                    <th scope="col">Family</th>
                    <th scope="col">From</th>
                    <th scope="col">Until</th>
                  </tr>
                </thead>
                <tbody>
                  {state.memberships
                    .filter((item) => item.householdId === id)
                    .map((item) => (
                      <tr key={item.id}>
                        <td>
                          {records.residents.find(
                            (row) => row.id === item.residentId,
                          )?.name ?? "Person unavailable"}
                        </td>
                        <td>{item.head ? "Head" : item.relationship}</td>
                        <td>
                          {state.families?.find(
                            (family) => family.id === item.familyId,
                          )?.label ?? "Not assigned"}
                        </td>
                        <td>{item.start}</td>
                        <td>{item.end ?? "Current"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
          <details className="panel household-secondary-panel household-record-actions">
            <summary>
              Household actions<span>Archive this household</span>
            </summary>
            {current.archived === "true" ? (
              <p className="notice">This household is archived.</p>
            ) : (
              <>
                <p className="muted">
                  Active members must be transferred or unassigned before
                  archival. History is retained.
                </p>
                <button
                  className="secondary danger"
                  onClick={() => {
                    setError("");
                    setRemoving(current);
                  }}
                >
                  Archive household
                </button>
              </>
            )}
          </details>
        </>
      )}
      {current && ["households", "housing"].includes(module) && (
        <section className="panel">
          <h2>Housing occupancy history</h2>
          {state.occupancies
            .filter((item) =>
              module === "households"
                ? item.householdId === id
                : item.unitId === id,
            )
            .map((item) => (
              <p key={item.id}>
                <Link to={`/housing/${item.unitId}`}>{item.unitId}</Link> ↔{" "}
                <Link to={`/households/${item.householdId}`}>
                  {item.householdId}
                </Link>{" "}
                · {item.start} → {item.end ?? "Current"}
              </p>
            ))}
          <p>
            Occupancy changes preserve previous assignments. Multiple households
            can share a unit.
          </p>
          {module === "households" && (
            <>
              <label>
                Move to housing unit
                <select
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                >
                  <option value="">Choose unit</option>
                  {records.housing
                    .filter((row) => row.archived !== "true")
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                </select>
              </label>
              <button disabled={!unit} onClick={() => setMoving(true)}>
                Change occupancy
              </button>
            </>
          )}
        </section>
      )}
      {action && (
        <ProfileDialog
          title={
            action === "head"
              ? "Change household head"
              : "Remove household member"
          }
          close={() => setAction(null)}
        >
          <p>{records.residents.find((row) => row.id === candidate)?.name}</p>
          <p className="form-intro">
            {action === "head"
              ? "This person will become the household head. The previous head remains a household member."
              : "This ends the person's membership in this household. Their resident profile remains available."}{" "}
            Previous assignments stay in history.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              confirmAction();
            }}
          >
            <label>
              Effective date
              <input
                required
                type="date"
                value={effective}
                max={today()}
                onChange={(event) => setEffective(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="profile-form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setAction(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={action === "end" ? "danger" : undefined}
              >
                Confirm change
              </button>
            </div>
          </form>
        </ProfileDialog>
      )}
      {draft && (
        <ProfileDialog
          personProfile={module === "residents"}
          title={`${records[module].some((row) => row.id === draft.id) ? "Edit" : "Register"} ${catalog[module].singular}`}
          close={() => {
            if (!saving) setDraft(null);
          }}
        >
          {module !== "residents" && (
            <p className="form-intro">
              Review the information below. Required fields must be completed
              before saving.
            </p>
          )}
          <form onSubmit={submit}>
            <fieldset
              disabled={saving}
              style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
            >
              {module === "residents" && (
                <ResidentProfileLayout
                  draft={draft}
                  existing={records.residents.some(
                    (row) => row.id === draft.id,
                  )}
                  fields={Object.fromEntries(
                    fields.map((field) => [
                      field.key,
                      renderProfileField(field),
                    ]),
                  )}
                  photoUrl={photoPreview || draft.photoUrl || ""}
                  photoName={photo?.name}
                  photoDisabled={
                    !saveResident ||
                    (draft._storage !== "database" &&
                      records.residents.some((row) => row.id === draft.id))
                  }
                  onPhotoChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file && file.size > 5 * 1024 * 1024) {
                      setError("Photo must be at most 5 MiB.");
                      event.target.value = "";
                      setPhoto(undefined);
                      return;
                    }
                    setError("");
                    setPhoto(file);
                  }}
                  ageSummary={
                    draft.birthdate && (
                      <>
                        Calculated age: {ageAt(draft.birthdate)} years. Age
                        groups:{" "}
                        {ageGroups(draft.birthdate, today()).join(", ") ||
                          "No listed age group"}
                        . Calculated automatically from birthdate.
                      </>
                    )
                  }
                  notice={
                    saveResident
                      ? draft._storage === "database" ||
                        !records.residents.some((row) => row.id === draft.id)
                        ? "Resident details are saved to the database. Household and family assignments above remain session only."
                        : "This is a local sample profile. Edits remain in this session; register a new resident to save to the database."
                      : undefined
                  }
                >
                  <label>
                    Household
                    <select
                      value={
                        draft.targetHousehold ??
                        memberships.find((item) => item.residentId === draft.id)
                          ?.householdId ??
                        ""
                      }
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          targetHousehold: event.target.value,
                          targetFamily:
                            (state.families ?? []).filter(
                              (family) =>
                                family.householdId === event.target.value,
                            ).length === 1
                              ? (state.families?.find(
                                  (family) =>
                                    family.householdId === event.target.value,
                                )?.id ?? "")
                              : "",
                        })
                      }
                    >
                      <option value="">Unassigned / retain current</option>
                      {records.households
                        .filter((row) => row.archived !== "true")
                        .map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Family
                    <select
                      value={
                        draft.targetFamily ??
                        memberships.find((item) => item.residentId === draft.id)
                          ?.familyId ??
                        ""
                      }
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          targetFamily: event.target.value,
                        })
                      }
                    >
                      <option value="">Not assigned to a family</option>
                      {(state.families ?? [])
                        .filter(
                          (family) =>
                            family.householdId ===
                            (draft.targetHousehold ||
                              memberships.find(
                                (item) => item.residentId === draft.id,
                              )?.householdId),
                        )
                        .map((family) => (
                          <option key={family.id} value={family.id}>
                            {family.label}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Relationship
                    <select
                      value={draft.relationship ?? "Member"}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          relationship: event.target.value,
                        })
                      }
                    >
                      {[
                        "Member",
                        "Head",
                        "Spouse",
                        "Son",
                        "Daughter",
                        "Parent",
                        "Sibling",
                        "Other",
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                </ResidentProfileLayout>
              )}
              <div className="form-grid">
                {module !== "residents" && fields.map(renderProfileField)}
                {module === "households" && (
                  <>
                    <label>
                      Household head
                      <select
                        value={draft.headId ?? ""}
                        onChange={(event) =>
                          setDraft({ ...draft, headId: event.target.value })
                        }
                      >
                        <option value="">Retain current / not assigned</option>
                        {sorted(records.residents)
                          .filter(
                            (row) =>
                              row.archived !== "true" &&
                              !memberships.some(
                                (item) =>
                                  item.residentId === row.id &&
                                  item.householdId !== draft.id,
                              ),
                          )
                          .map((row) => (
                            <option key={row.id} value={row.id}>
                              {display(row)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Housing unit
                      <select
                        value={draft.unitId ?? ""}
                        onChange={(event) =>
                          setDraft({ ...draft, unitId: event.target.value })
                        }
                      >
                        <option value="">Retain current / unassigned</option>
                        {records.housing
                          .filter((row) => row.archived !== "true")
                          .map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </>
                )}
                {module === "surveys" && (
                  <label>
                    Household
                    <select
                      required
                      value={draft.householdId ?? returnHousehold ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, householdId: event.target.value })
                      }
                    >
                      <option value="">Choose household</option>
                      {records.households.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {module === "residents" &&
                records.residents.some(
                  (row) =>
                    row.id !== draft.id &&
                    row.name.toLowerCase() ===
                      `${draft.firstName ?? ""} ${draft.surname ?? ""}`
                        .trim()
                        .toLowerCase(),
                ) && (
                  <p className="notice">
                    Potential duplicate: review the directory before saving. No
                    automatic merge.
                  </p>
                )}
              <div className="profile-form-actions">
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  disabled={saving}
                  className="secondary"
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </button>
                <button disabled={saving}>
                  {module === "residents" && (
                    <Save size={17} aria-hidden="true" />
                  )}
                  {saving ? "Saving…" : "Save profile"}
                </button>
              </div>
            </fieldset>
          </form>
          {returnHousehold && module === "residents" && (
            <p>
              This resident will be assigned to the selected household when
              saved. Existing heads cannot be replaced here.
            </p>
          )}
        </ProfileDialog>
      )}
      {removing && (
        <ProfileDialog
          title="Confirm record removal"
          close={() => setRemoving(null)}
        >
          <p>
            Remove {removing.name} from the active directory? The record will be
            archived and historical relationships retained. A removed resident's
            active membership will end.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="danger" onClick={remove}>
            Confirm delete
          </button>
          <button className="secondary" onClick={() => setRemoving(null)}>
            Cancel
          </button>
        </ProfileDialog>
      )}
      {moving && (
        <ProfileDialog
          title="Confirm housing move"
          close={() => setMoving(false)}
        >
          <p>
            Move this household to{" "}
            {records.housing.find((row) => row.id === unit)?.name}? Previous
            occupancy remains in history.
          </p>
          <button
            onClick={() => {
              change({
                ...state,
                occupancies: [
                  ...state.occupancies.map((item) =>
                    item.householdId === id && !item.end
                      ? { ...item, end: today() }
                      : item,
                  ),
                  {
                    id: crypto.randomUUID(),
                    householdId: id!,
                    unitId: unit,
                    start: today(),
                    end: null,
                  },
                ],
              });
              setMoving(false);
            }}
          >
            Confirm move
          </button>
          <button className="secondary" onClick={() => setMoving(false)}>
            Cancel
          </button>
        </ProfileDialog>
      )}
    </div>
  );
}
