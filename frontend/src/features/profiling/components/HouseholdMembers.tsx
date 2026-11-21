import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  Plus,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { ageAt, type RecordRow } from "../../../demo/catalog";
import { assign, assignFamily, type Relationships } from "../model";
import { ProfileDialog } from "../ProfileDialog";
import "../household.css";

const personName = (person?: RecordRow) =>
  person
    ? person.surname
      ? `${person.surname}, ${person.firstName}`
      : person.name
    : "Person unavailable";
const initials = (name: string) =>
  name
    .replaceAll(",", "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

type FamilyEditor = { id?: string; label: string; selected: string[] };

export function HouseholdMembers({
  householdId,
  residents,
  households,
  state,
  update,
  onAction,
  date,
  archived,
}: {
  householdId: string;
  residents: RecordRow[];
  households: RecordRow[];
  state: Relationships;
  update: (next: Relationships, message: string) => void;
  onAction: (action: "head" | "end", residentId: string) => void;
  date: string;
  archived: boolean;
}) {
  const members = state.memberships.filter(
    (item) => item.householdId === householdId && !item.end,
  );
  const families = (state.families ?? []).filter(
    (family) => family.householdId === householdId,
  );
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [familyEditor, setFamilyEditor] = useState<FamilyEditor | null>(null);
  const [selectionSearch, setSelectionSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [candidate, setCandidate] = useState("");
  const [residentSearch, setResidentSearch] = useState("");
  const [relationship, setRelationship] = useState("Member");
  const [targetFamily, setTargetFamily] = useState("");
  const [effective, setEffective] = useState(date);
  const [managing, setManaging] = useState<string | null>(null);
  const [error, setError] = useState("");
  const activeMember = members.find((item) => item.residentId === managing);
  const selectedPerson = residents.find((person) => person.id === candidate);
  const previous = state.memberships.find(
    (item) => item.residentId === candidate && !item.end,
  );
  const previousHousehold = households.find(
    (household) => household.id === previous?.householdId,
  );
  const registerLink = (familyId = "") =>
    `/residents?household=${encodeURIComponent(householdId)}${familyId ? `&family=${encodeURIComponent(familyId)}` : ""}`;
  const available = residents.filter(
    (person) =>
      person.archived !== "true" &&
      !members.some((item) => item.residentId === person.id),
  );
  const visible = members
    .filter((member) => {
      const person = residents.find((item) => item.id === member.residentId);
      return (
        (familyFilter === "all" ||
          (familyFilter === "unassigned"
            ? !member.familyId
            : member.familyId === familyFilter)) &&
        `${personName(person)} ${person?.id ?? ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      );
    })
    .sort(
      (a, b) =>
        Number(b.head) - Number(a.head) ||
        personName(
          residents.find((person) => person.id === a.residentId),
        ).localeCompare(
          personName(residents.find((person) => person.id === b.residentId)),
        ),
    );

  function openAdd(familyId = families.length === 1 ? families[0].id : "") {
    setError("");
    setCandidate("");
    setResidentSearch("");
    setRelationship("Member");
    setTargetFamily(familyId);
    setEffective(date);
    setAdding(true);
  }
  function editFamily(familyId?: string) {
    const family = families.find((item) => item.id === familyId);
    setFamilyEditor({
      id: familyId,
      label: family?.label ?? `Family ${families.length + 1}`,
      selected: members
        .filter((item) => familyId && item.familyId === familyId)
        .map((item) => item.residentId),
    });
    setSelectionSearch("");
    setError("");
  }
  function saveFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!familyEditor || archived) return;
    const label = familyEditor.label.trim();
    if (!label) {
      setError("Enter a family name.");
      return;
    }
    if (
      families.some(
        (family) =>
          family.id !== familyEditor.id &&
          family.label.toLowerCase() === label.toLowerCase(),
      )
    ) {
      setError("This household already has a family with that name.");
      return;
    }
    try {
      const familyId = familyEditor.id ?? crypto.randomUUID();
      let next: Relationships = {
        ...state,
        families: familyEditor.id
          ? state.families
          : [...(state.families ?? []), { id: familyId, householdId, label }],
      };
      for (const member of members) {
        if (familyEditor.selected.includes(member.residentId))
          next = assignFamily(
            next,
            member.id,
            familyId,
            date,
            crypto.randomUUID(),
          );
        else if (member.familyId === familyId)
          next = assignFamily(
            next,
            member.id,
            undefined,
            date,
            crypto.randomUUID(),
          );
      }
      update(
        next,
        `${label} ${familyEditor.id ? "members updated" : "added"}. Household membership and history are preserved.`,
      );
      setFamilyEditor(null);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }
  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (archived) return;
    if (!available.some((person) => person.id === candidate)) {
      setError("Choose an available person.");
      return;
    }
    if (!relationship.trim()) {
      setError("Enter the relationship to the household head.");
      return;
    }
    if (!effective || effective > date) {
      setError("Choose an effective date on or before today.");
      return;
    }
    try {
      const membershipId = crypto.randomUUID();
      let next = assign(
        state,
        candidate,
        householdId,
        relationship.trim(),
        effective,
        membershipId,
      );
      next = assignFamily(
        next,
        membershipId,
        targetFamily || undefined,
        effective,
        crypto.randomUUID(),
      );
      update(
        next,
        `${personName(selectedPerson)} added to this household. Previous membership history is retained.`,
      );
      setAdding(false);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <div className="household-workspace">
      <section
        className="panel household-families"
        aria-labelledby="household-families-title"
      >
        <div className="household-section-heading">
          <div>
            <p className="eyebrow">FAMILY GROUPS</p>
            <h2 id="household-families-title">
              Families within this household{" "}
              <span className="household-count">{families.length}</span>
            </h2>
            <p className="muted">
              Family 1 is created automatically. Add another family and choose
              its members when more than one family lives here.
            </p>
          </div>
          {!archived && (
            <button type="button" onClick={() => editFamily()}>
              <Plus size={16} aria-hidden="true" />
              Add family
            </button>
          )}
        </div>
        {!families.length ? (
          <div className="household-family-empty">
            <span className="household-empty-icon">
              <UsersRound size={24} aria-hidden="true" />
            </span>
            <div>
              <h3>No families added yet</h3>
              <p>
                Add your first family and select its members. Everyone remains
                part of this household.
              </p>
            </div>
          </div>
        ) : (
          <div className="household-family-grid">
            {families.map((family, index) => {
              const familyMembers = members.filter(
                (item) => item.familyId === family.id,
              );
              return (
                <article
                  className="household-family-card"
                  key={family.id}
                  aria-label={family.label}
                >
                  <div className="household-family-card-heading">
                    <span className="household-family-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3>{family.label}</h3>
                      <p>
                        {familyMembers.length}{" "}
                        {familyMembers.length === 1 ? "member" : "members"}
                      </p>
                    </div>
                  </div>
                  {familyMembers.length ? (
                    <ul className="household-family-people">
                      {familyMembers.map((member) => (
                        <li key={member.id}>
                          <Link
                            to={`/residents/${member.residentId}?household=${householdId}`}
                          >
                            {personName(
                              residents.find(
                                (person) => person.id === member.residentId,
                              ),
                            )}
                          </Link>
                          {member.head && (
                            <span className="household-head-badge">
                              Household head
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="household-family-no-members">
                      No members yet. Choose people below to build this family.
                    </p>
                  )}
                  {!archived && (
                    <div className="household-family-actions">
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => editFamily(family.id)}
                      >
                        Choose members
                      </button>
                      <button
                        className="secondary"
                        type="button"
                        onClick={() => openAdd(family.id)}
                        aria-label={`Add person to ${family.label}`}
                      >
                        <UserPlus size={14} aria-hidden="true" />
                        Add person
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        <p className="household-family-note">
          {members.filter((member) => !member.familyId).length} household
          members are not assigned to a family. A person is counted once in the
          household total.
        </p>
      </section>

      <section
        className="panel household-members"
        aria-labelledby="household-members-title"
      >
        <div className="household-section-heading">
          <div>
            <p className="eyebrow">PEOPLE IN THIS HOUSEHOLD</p>
            <h2 id="household-members-title">
              Household members ({members.length})
            </h2>
            <p className="muted">
              View profiles, organize families, and manage household membership.
            </p>
          </div>
          {!archived && (
            <button type="button" onClick={() => openAdd()}>
              <UserPlus size={16} aria-hidden="true" />
              Add member
            </button>
          )}
        </div>
        <div className="household-member-toolbar">
          <label>
            Search household members
            <span className="household-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or reference number"
              />
            </span>
          </label>
          <label>
            Filter by family
            <select
              value={familyFilter}
              onChange={(event) => setFamilyFilter(event.target.value)}
            >
              <option value="all">All families</option>
              <option value="unassigned">Not assigned to a family</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Current household members and their family assignments
            </caption>
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Age</th>
                <th scope="col">Relationship to head</th>
                <th scope="col">Family</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((member) => {
                const person = residents.find(
                  (item) => item.id === member.residentId,
                );
                const name = personName(person);
                return (
                  <tr key={member.id}>
                    <td>
                      <div className="household-person">
                        <span
                          className="household-person-avatar"
                          aria-hidden="true"
                        >
                          {initials(name)}
                        </span>
                        <div>
                          <Link
                            to={`/residents/${member.residentId}?household=${householdId}`}
                          >
                            {name}
                          </Link>
                          <small>
                            {person?.residencyClassification ??
                              "Residency not classified"}
                          </small>
                          {member.head && (
                            <span className="household-head-badge">
                              Household head
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td data-label="Age">
                      {person ? ageAt(person.birthdate) : "Not recorded"}
                    </td>
                    <td data-label="Relationship to head">
                      {member.head ? "Head" : member.relationship}
                    </td>
                    <td data-label="Family">
                      <span
                        className={
                          member.familyId ? "household-family-tag" : "muted"
                        }
                      >
                        {families.find(
                          (family) => family.id === member.familyId,
                        )?.label ?? "Not assigned"}
                      </span>
                    </td>
                    <td>
                      <div className="household-row-actions">
                        <Link
                          to={`/residents/${member.residentId}?household=${householdId}`}
                          aria-label={`View ${name}`}
                        >
                          View <ArrowUpRight size={13} aria-hidden="true" />
                        </Link>
                        {!archived && (
                          <button
                            className="secondary"
                            type="button"
                            aria-label={`Manage ${name}`}
                            onClick={() => {
                              setManaging(member.residentId);
                              setTargetFamily(member.familyId ?? "");
                              setError("");
                            }}
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="household-list-empty">
            <h3>{members.length ? "No matching members" : "No members yet"}</h3>
            <p>
              {members.length
                ? "Try another name or select All families."
                : "Add an existing person or register someone new to get started."}
            </p>
          </div>
        )}
        <div className="household-list-footer">
          Showing {visible.length} of {members.length} household members
        </div>
      </section>

      {familyEditor && (
        <ProfileDialog
          title={
            familyEditor.id
              ? `Choose members for ${familyEditor.label}`
              : "Add family"
          }
          close={() => setFamilyEditor(null)}
        >
          <form onSubmit={saveFamily}>
            <p className="form-intro">
              {familyEditor.id
                ? "Select the people who belong to this family. Unchecked people stay in the household without this family assignment."
                : "Give the family a name and choose its household members. Repeat Add family to create a second family."}
            </p>
            {!familyEditor.id && (
              <label>
                Family name
                <input
                  required
                  maxLength={100}
                  autoFocus
                  placeholder="e.g. Family 2"
                  value={familyEditor.label}
                  onChange={(event) =>
                    setFamilyEditor({
                      ...familyEditor,
                      label: event.target.value,
                    })
                  }
                />
              </label>
            )}
            <fieldset className="household-member-picker">
              <legend>
                Choose household members{" "}
                <span>{familyEditor.selected.length} selected</span>
              </legend>
              <label>
                Find a household member
                <input
                  value={selectionSearch}
                  onChange={(event) => setSelectionSearch(event.target.value)}
                  placeholder="Search by name"
                />
              </label>
              <div className="household-picker-list">
                {members
                  .filter((member) =>
                    personName(
                      residents.find(
                        (person) => person.id === member.residentId,
                      ),
                    )
                      .toLowerCase()
                      .includes(selectionSearch.toLowerCase()),
                  )
                  .map((member) => {
                    const name = personName(
                      residents.find(
                        (person) => person.id === member.residentId,
                      ),
                    );
                    const currentFamily = families.find(
                      (family) => family.id === member.familyId,
                    );
                    return (
                      <label
                        className="household-picker-option"
                        key={member.id}
                      >
                        <input
                          type="checkbox"
                          checked={familyEditor.selected.includes(
                            member.residentId,
                          )}
                          onChange={(event) =>
                            setFamilyEditor({
                              ...familyEditor,
                              selected: event.target.checked
                                ? [...familyEditor.selected, member.residentId]
                                : familyEditor.selected.filter(
                                    (residentId) =>
                                      residentId !== member.residentId,
                                  ),
                            })
                          }
                        />
                        <span>
                          <strong>{name}</strong>
                          <small>
                            {currentFamily
                              ? `Currently in ${currentFamily.label}`
                              : "Not assigned to a family"}
                            {member.head ? " · Household head" : ""}
                          </small>
                        </span>
                      </label>
                    );
                  })}
              </div>
              {!members.length && (
                <p className="muted">
                  No household members yet. Create the family, then use Add
                  person.
                </p>
              )}
            </fieldset>
            <p className="household-form-hint">
              Selecting someone from another family moves their family
              assignment. Their household membership and history stay intact.
            </p>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="profile-form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setFamilyEditor(null)}
              >
                Cancel
              </button>
              <button type="submit">
                <Check size={16} aria-hidden="true" />
                {familyEditor.id ? "Save members" : "Create family"}
              </button>
            </div>
          </form>
        </ProfileDialog>
      )}

      {adding && (
        <ProfileDialog
          title="Add household member"
          close={() => setAdding(false)}
        >
          <p className="form-intro">
            Choose an existing person to avoid duplicate profiles, or register
            someone new.
          </p>
          <Link
            className="household-register-link"
            to={registerLink(targetFamily)}
          >
            <UserPlus size={18} aria-hidden="true" />
            <span>
              <strong>Register a new resident</strong>
              <small>
                Opens registration with this household
                {targetFamily ? " and family" : ""} selected.
              </small>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <form onSubmit={addMember}>
            <fieldset className="household-member-picker">
              <legend>Choose an existing person</legend>
              <label>
                Search registered people
                <input
                  value={residentSearch}
                  onChange={(event) => setResidentSearch(event.target.value)}
                  placeholder="Name or reference number"
                />
              </label>
              <div className="household-picker-list">
                {available
                  .filter((person) =>
                    `${personName(person)} ${person.id}`
                      .toLowerCase()
                      .includes(residentSearch.toLowerCase()),
                  )
                  .map((person) => {
                    const membership = state.memberships.find(
                      (item) => item.residentId === person.id && !item.end,
                    );
                    return (
                      <label
                        className="household-picker-option"
                        key={person.id}
                      >
                        <input
                          type="radio"
                          name="household-person"
                          required
                          value={person.id}
                          checked={candidate === person.id}
                          onChange={() => setCandidate(person.id)}
                        />
                        <span>
                          <strong>{personName(person)}</strong>
                          <small>
                            {membership
                              ? `In ${households.find((household) => household.id === membership.householdId)?.name ?? membership.householdId} · Transfer required`
                              : "Not assigned to a household"}
                          </small>
                        </span>
                      </label>
                    );
                  })}
              </div>
              {!available.length && (
                <p className="muted">
                  All registered people already belong to this household. Use
                  Register a new resident to add someone new.
                </p>
              )}
            </fieldset>
            {selectedPerson && (
              <p className="household-selected-person">
                Selected: <strong>{personName(selectedPerson)}</strong>
              </p>
            )}
            {previous && (
              <p className="notice">
                This will transfer {personName(selectedPerson)} from{" "}
                {previousHousehold?.name ?? previous.householdId}.{" "}
                {previous.head
                  ? "The previous household will be left without a head. "
                  : ""}
                Their previous membership stays in history.
              </p>
            )}
            <div className="form-grid">
              <label>
                Relationship to household head
                <input
                  required
                  maxLength={100}
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value)}
                  placeholder="e.g. Daughter, Son, Spouse"
                />
              </label>
              <label>
                Family
                <select
                  value={targetFamily}
                  onChange={(event) => setTargetFamily(event.target.value)}
                >
                  <option value="">Not assigned to a family</option>
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Membership starts on
                <input
                  required
                  type="date"
                  max={date}
                  value={effective}
                  onChange={(event) => setEffective(event.target.value)}
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="profile-form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
              <button disabled={!candidate} type="submit">
                {previous ? "Transfer member" : "Add member"}
              </button>
            </div>
          </form>
        </ProfileDialog>
      )}

      {activeMember && (
        <ProfileDialog
          title={`Manage ${personName(residents.find((person) => person.id === managing))}`}
          close={() => setManaging(null)}
        >
          <p className="form-intro">
            Changes here affect this household. The person's profile remains
            available.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              try {
                update(
                  assignFamily(
                    state,
                    activeMember.id,
                    targetFamily || undefined,
                    date,
                    crypto.randomUUID(),
                  ),
                  "Family assignment updated. Membership history is preserved.",
                );
                setManaging(null);
              } catch (caught) {
                setError((caught as Error).message);
              }
            }}
          >
            <label>
              Family assignment
              <select
                value={targetFamily}
                onChange={(event) => setTargetFamily(event.target.value)}
              >
                <option value="">Not assigned to a family</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="household-form-hint">
              Use Add family on the household page if the family is not listed.
            </p>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="profile-form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setManaging(null)}
              >
                Cancel
              </button>
              <button type="submit">Save family assignment</button>
            </div>
          </form>
          <div className="household-manage-actions">
            <Link to={`/residents/${managing}?household=${householdId}&edit=1`}>
              Edit resident profile{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            {activeMember.head ? (
              <p className="household-head-badge">Current household head</p>
            ) : (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setManaging(null);
                  onAction("head", activeMember.residentId);
                }}
              >
                Make household head
              </button>
            )}
            <button
              type="button"
              className="secondary danger"
              onClick={() => {
                setManaging(null);
                onAction("end", activeMember.residentId);
              }}
            >
              Remove from household
            </button>
          </div>
        </ProfileDialog>
      )}
    </div>
  );
}
