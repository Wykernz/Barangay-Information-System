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
  initialRelationships,
  selectHead,
  type Relationships,
} from "./model";
import "./profiling.css";
import { ProfilePageHeader } from "./components/ProfilePageHeader";
import { ProfileActions } from "./components/ProfileActions";
import { ProfileFeedback } from "./components/ProfileFeedback";
import { ProfileDialog } from "./ProfileDialog";

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
export function ProfilingPage({ module }: { module: string }) {
  const { records, save } = useDemo();
  const { state, change } = useProfiling();
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<RecordRow | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [candidate, setCandidate] = useState("");
  const [relationship, setRelationship] = useState("Member");
  const [effective, setEffective] = useState(today);
  const [action, setAction] = useState<"assign" | "end" | "head" | null>(null);
  const [removing, setRemoving] = useState<RecordRow | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [unit, setUnit] = useState("");
  const [moving, setMoving] = useState(false);
  const current = records[module].find((row) => row.id === id);
  const memberships = state.memberships.filter((item) => !item.end);
  const householdMembers = memberships.filter(
    (item) => item.householdId === id,
  );
  // Use one filtered collection for rows and empty states, including archive visibility.
  const visibleRows = sorted(records[module]).filter(
    (row) =>
      (showArchived || row.archived !== "true") &&
      `${display(row)} ${row.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const returnHousehold = params.get("household");
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
  }, [module, id, returnHousehold, params.get("edit")]);
  function edit(row?: RecordRow) {
    setError("");
    setMessage("");
    setDraft(
      row
        ? { ...row }
        : {
            id: `DEMO-${crypto.randomUUID()}`,
            ...Object.fromEntries(
              catalog[module].fields.map((field) => [
                field.key,
                field.options?.[0] ?? "",
              ]),
            ),
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
            }
          : value,
      );
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    // Validate the draft and compute relationship changes before applying UI state.
    // This adapter is not a database transaction; the backend contract requires one.
    event.preventDefault();
    if (!draft) return;
    if (
      module === "residents" &&
      (!draft.firstName?.trim() ||
        !draft.surname?.trim() ||
        !draft.birthdate ||
        draft.birthdate > today())
    ) {
      setError(
        "Enter first name, surname, and a birthdate that is not in the future.",
      );
      return;
    }
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
    let next = state;
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
    delete row.relationship;
    delete row.headId;
    delete row.unitId;
    change(next);
    save(module, row);
    setDraft(null);
    setMessage("Profile updated in this session.");
    if (!id) navigate(`/${module}/${row.id}`);
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
              action === "end" ? null : id!,
              relationship,
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
          ...catalog.residents.fields
            .filter((field) => field.key !== "name")
            .map((field) =>
              field.key === "purok"
                ? {
                    ...field,
                    options: ["Purok 1", "Purok 2", "Purok 3", "Not recorded"],
                  }
                : field,
            ),
          {
            key: "civilStatus",
            label: "Civil status",
            options: [
              "Not recorded",
              "Single",
              "Married",
              "Widowed",
              "Separated",
              "Other",
            ],
          },
        ]
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
          ...(module === "households"
            ? [
                {
                  key: "purok",
                  label: "Purok",
                  options: ["Purok 1", "Purok 2", "Purok 3", "Not recorded"],
                },
              ]
            : []),
        ];
  function remove() {
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
    change(next);
    save(module, { ...removing, archived: "true" });
    setRemoving(null);
    navigate(`/${module}`);
    setMessage(
      "Record removed from the active directory. History retained in archived records.",
    );
  }
  return (
    <div className="profiling">
      <ProfilePageHeader
        module={module}
        title={current ? display(current) : catalog[module].title}
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
      {error && <ProfileFeedback message={error} error />}
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
              {records[module].filter((row) => row.archived !== "true").length}{" "}
              active records
            </span>
          </div>
          <div className="profile-toolbar">
            <label>
              Search {catalog[module].title.toLowerCase()}
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
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
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const member = memberships.find(
                    (item) => item.residentId === row.id,
                  );
                  const head = memberships.find(
                    (item) => item.householdId === row.id && item.head,
                  );
                  return (
                    <tr key={row.id}>
                      <td>{row.id}</td>
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
                          restore={() =>
                            save(module, { ...row, archived: "false" })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!visibleRows.length && (
            <p className="profile-empty">
              No matching records. Try another search or show archived records.
            </p>
          )}
        </section>
      )}
      {current && (
        <section className="panel">
          {module === "residents" && (
            <div className="profile-identity">
              <span className="profile-initials" aria-hidden="true">
                {current.firstName?.[0]}
                {current.surname?.[0]}
              </span>
              <div>
                <h2>{current.name}</h2>
                <p className="muted">
                  {memberships.find((item) => item.residentId === current.id)
                    ?.relationship ?? "Unassigned"}
                </p>
              </div>
            </div>
          )}
          {current.archived === "true" ? (
            <p className="notice">
              Archived record. Restore it from the directory before active use.
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
          )}
          <h2>
            {module === "households"
              ? "Household information"
              : "Profile details"}
          </h2>
          {module !== "households" && (
            <dl className="profile-details">
              {Object.entries(current)
                .filter(([key]) => !["head", "housing"].includes(key))
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
            <dl className="profile-details household-summary">
              {[
                ["Household head", householdHead(current.id)],
                ["Purok", current.purok ?? "Not recorded"],
                [
                  "Housing material",
                  unitFor(current.id)?.material ?? "Not assigned",
                ],
                ["Water source", unitFor(current.id)?.water ?? "Not recorded"],
                [
                  "Toilet / CR",
                  unitFor(current.id)?.sanitation ?? "Not recorded",
                ],
                ["Total members", String(householdMembers.length)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              {unitFor(current.id) && (
                <div>
                  <dt>Physical housing unit</dt>
                  <dd>
                    <Link to={`/housing/${unitFor(current.id)!.id}`}>
                      {unitFor(current.id)!.name}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          )}
          {module === "residents" && (
            <>
              <p>Age: {ageAt(current.birthdate)}</p>
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
          <section className="panel">
            <h2>Household members ({householdMembers.length})</h2>
            <p>
              Head:{" "}
              {records.residents.find(
                (row) =>
                  row.id ===
                  householdMembers.find((item) => item.head)?.residentId,
              )?.name ?? "Unassigned"}
            </p>
            <div className="button-row">
              <Link to={`/residents?household=${id}`}>
                Register a new resident
              </Link>
            </div>
            <label>
              Existing resident
              <select
                value={candidate}
                onChange={(event) => setCandidate(event.target.value)}
              >
                <option value="">Choose a resident</option>
                {sorted(records.residents)
                  .filter((row) => row.archived !== "true")
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {display(row)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Relationship
              <input
                value={relationship}
                onChange={(event) => setRelationship(event.target.value)}
              />
            </label>
            <button
              disabled={
                !candidate ||
                householdMembers.some((item) => item.residentId === candidate)
              }
              onClick={() => {
                setError("");
                setAction("assign");
              }}
            >
              Assign / transfer resident
            </button>
            {householdMembers.map((item) => {
              const person = records.residents.find(
                (row) => row.id === item.residentId,
              );
              return (
                <div className="quality-row" key={item.id}>
                  <Link to={`/residents/${item.residentId}?household=${id}`}>
                    <strong>
                      {person ? display(person) : "Unknown resident"}
                    </strong>
                    <small>
                      {item.head ? "Head" : item.relationship} ·{" "}
                      {person ? ageAt(person.birthdate) : "—"} years
                    </small>
                  </Link>
                  <div className="profile-actions">
                    <Link to={`/residents/${item.residentId}?household=${id}`}>
                      View
                    </Link>
                    <Link
                      to={`/residents/${item.residentId}?household=${id}&edit=1`}
                    >
                      Edit
                    </Link>
                    <button
                      className="text-button"
                      onClick={() => {
                        setCandidate(item.residentId);
                        setAction("head");
                      }}
                    >
                      Select head
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setCandidate(item.residentId);
                        setAction("end");
                      }}
                    >
                      Unassign
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
          <section className="panel">
            <h2>Membership history</h2>
            {state.memberships
              .filter((item) => item.householdId === id)
              .map((item) => (
                <p key={item.id}>
                  {
                    records.residents.find((row) => row.id === item.residentId)
                      ?.name
                  }{" "}
                  · {item.head ? "Head" : item.relationship} · {item.start} →{" "}
                  {item.end ?? "Current"}
                </p>
              ))}
          </section>
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
        <section className="panel">
          <h2>
            Confirm{" "}
            {action === "assign"
              ? "assignment / transfer"
              : action === "head"
                ? "head selection"
                : "unassignment"}
          </h2>
          <p>
            {records.residents.find((row) => row.id === candidate)?.name}.
            Current membership segments will be retained. A transferring head
            leaves the previous household without a head.
          </p>
          <label>
            Effective date
            <input
              type="date"
              value={effective}
              max={today()}
              onChange={(event) => setEffective(event.target.value)}
            />
          </label>
          <button onClick={confirmAction}>Confirm change</button>
          <button className="secondary" onClick={() => setAction(null)}>
            Cancel
          </button>
        </section>
      )}
      {draft && (
        <ProfileDialog
          title={`${records[module].some((row) => row.id === draft.id) ? "Edit" : "Register"} ${catalog[module].singular}`}
          close={() => setDraft(null)}
        >
          <p className="form-intro">
            Review the information below. Required fields must be completed
            before saving.
          </p>
          <form onSubmit={submit}>
            <div className="form-grid">
              {fields.map((field) => (
                <label key={field.key}>
                  {field.label}
                  {"options" in field && field.options ? (
                    <select
                      value={draft[field.key] ?? field.options[0]}
                      onChange={(event) =>
                        setDraft({ ...draft, [field.key]: event.target.value })
                      }
                    >
                      {field.options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      type={"type" in field ? field.type : "text"}
                      maxLength={150}
                      value={draft[field.key] ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, [field.key]: event.target.value })
                      }
                    />
                  )}
                </label>
              ))}
              {module === "residents" && (
                <>
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
                </>
              )}
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
              <button>Save profile</button>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button
                type="button"
                className="secondary"
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
            </div>
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
