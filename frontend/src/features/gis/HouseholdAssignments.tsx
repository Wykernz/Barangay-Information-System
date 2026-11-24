import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Building2, UserRoundPlus, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api";

type Page<T> = { results: T[]; next: string | null };
type Resident = {
  id: string;
  reference: string;
  given_name: string;
  middle_name: string;
  family_name: string;
  suffix: string;
};
type Household = {
  id: string;
  reference: string;
  label: string;
  is_active: boolean;
};
type HousingUnit = {
  id: string;
  reference: string;
  label: string;
  is_active: boolean;
};
type Membership = {
  id: string;
  resident: string;
  household: string;
  relationship: string;
  occupancy_type: string;
  is_head: boolean;
  valid_from: string;
  valid_to: string | null;
};
type Occupancy = {
  id: string;
  household: string;
  housing_unit: string;
  valid_from: string;
  valid_to: string | null;
};

function localDate() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

async function allPages<T>(url: string, params: Record<string, string> = {}) {
  const rows: T[] = [];
  let page = 1;
  while (true) {
    const response = await api.get<Page<T>>(url, {
      params: { ...params, page },
    });
    rows.push(...response.data.results);
    if (!response.data.next) return rows;
    page += 1;
  }
}

function residentName(resident: Resident) {
  const given = [resident.given_name, resident.middle_name]
    .filter(Boolean)
    .join(" ");
  const suffix = resident.suffix ? ` ${resident.suffix}` : "";
  return `${resident.family_name}, ${given}${suffix}`;
}

function failureMessage(error: unknown, action: string) {
  const response = (
    error as { response?: { status?: number; data?: { detail?: string } } }
  ).response;
  if (response?.data?.detail) return response.data.detail;
  if (response?.status === 403)
    return `You do not have permission to ${action}.`;
  if (response?.status === 400)
    return `Check the entered details before you ${action}.`;
  return `Could not ${action}. Check the server connection and try again.`;
}

export default function HouseholdAssignments({
  householdId,
  onChanged,
}: {
  householdId: string;
  onChanged?: () => void;
}) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [occupancies, setOccupancies] = useState<Occupancy[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [units, setUnits] = useState<HousingUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [residentId, setResidentId] = useState("");
  const [relationship, setRelationship] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(localDate());
  const [managedMembership, setManagedMembership] = useState("");
  const [destinationHousehold, setDestinationHousehold] = useState("");
  const [transitionDate, setTransitionDate] = useState(localDate());
  const [housingUnit, setHousingUnit] = useState("");
  const [moveDate, setMoveDate] = useState(localDate());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [memberRows, occupancyRows, residentRows, householdRows, unitRows] =
        await Promise.all([
          allPages<Membership>("household-memberships/", {
            household: householdId,
          }),
          allPages<Occupancy>("household-occupancies/", {
            household: householdId,
          }),
          allPages<Resident>("residents/"),
          allPages<Household>("households/"),
          allPages<HousingUnit>("housing-units/"),
        ]);
      setMemberships(memberRows);
      setOccupancies(occupancyRows);
      setResidents(residentRows);
      setHouseholds(householdRows);
      setUnits(unitRows);
    } catch {
      setError(
        "Household assignments are unavailable or your account does not have access.",
      );
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    void load();
  }, [load, refresh]);

  const residentById = useMemo(
    () => new Map(residents.map((resident) => [resident.id, resident])),
    [residents],
  );
  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );
  const currentMemberships = memberships.filter(
    (membership) => !membership.valid_to,
  );
  const currentOccupancy = occupancies.find((occupancy) => !occupancy.valid_to);

  async function mutate(action: string, request: () => Promise<unknown>) {
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.get("auth/csrf/");
      await request();
      setNotice(`${action} saved. Previous dated records remain in history.`);
      onChanged?.();
      setRefresh((value) => value + 1);
    } catch (failure) {
      setError(failureMessage(failure, action.toLowerCase()));
    } finally {
      setSaving(false);
    }
  }

  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("Member assignment", () =>
      api.post(`households/${encodeURIComponent(householdId)}/members/`, {
        resident: residentId,
        relationship: relationship.trim(),
        occupancy_type: "FAMILY_MEMBER",
        is_head: false,
        effective_date: effectiveDate,
      }),
    );
  }

  function transferMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const membership = memberships.find((row) => row.id === managedMembership);
    void mutate("Member transfer", () =>
      api.post(
        `household-memberships/${encodeURIComponent(managedMembership)}/transfer/`,
        {
          destination_household: destinationHousehold,
          relationship: membership?.relationship ?? "",
          occupancy_type: membership?.occupancy_type ?? "FAMILY_MEMBER",
          is_head: false,
          effective_date: transitionDate,
        },
      ),
    );
  }

  function endMember() {
    void mutate("Membership closure", () =>
      api.post(
        `household-memberships/${encodeURIComponent(managedMembership)}/end/`,
        {
          effective_date: transitionDate,
        },
      ),
    );
  }

  function moveHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("Housing assignment", () =>
      api.post(`households/${encodeURIComponent(householdId)}/move/`, {
        housing_unit: housingUnit,
        effective_date: moveDate,
      }),
    );
  }

  if (loading) return <p role="status">Loading household assignments…</p>;
  return (
    <div className="household-assignment-sections">
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <section
        className="household-detail-card"
        aria-labelledby="member-heading"
      >
        <h2 id="member-heading">
          <UsersRound size={19} /> Household members
        </h2>
        {currentMemberships.length ? (
          <div className="assignment-list">
            {currentMemberships.map((membership) => {
              const resident = residentById.get(membership.resident);
              return (
                <div key={membership.id}>
                  <strong>
                    {resident ? residentName(resident) : membership.resident}
                  </strong>
                  <span>
                    {membership.relationship || "Relationship not recorded"} ·
                    since {membership.valid_from}
                  </span>
                  <Link to={`/residents/${membership.resident}`}>
                    View resident
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <p>No current members are assigned.</p>
        )}

        <form className="assignment-form" onSubmit={addMember}>
          <h3>
            <UserRoundPlus size={17} /> Assign an existing resident
          </h3>
          <label>
            Resident
            <select
              required
              value={residentId}
              onChange={(event) => setResidentId(event.target.value)}
            >
              <option value="">Select resident</option>
              {residents.map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {residentName(resident)} ({resident.reference})
                </option>
              ))}
            </select>
          </label>
          <label>
            Relationship
            <input
              maxLength={100}
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
              placeholder="e.g. Child, spouse, relative"
            />
          </label>
          <label>
            Effective date
            <input
              required
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </label>
          <button disabled={saving} type="submit">
            {saving ? "Saving…" : "Assign resident"}
          </button>
        </form>

        {currentMemberships.length > 0 && (
          <form className="assignment-form" onSubmit={transferMember}>
            <h3>Transfer or end a membership</h3>
            <label>
              Current member
              <select
                required
                value={managedMembership}
                onChange={(event) => setManagedMembership(event.target.value)}
              >
                <option value="">Select member</option>
                {currentMemberships.map((membership) => (
                  <option key={membership.id} value={membership.id}>
                    {residentById.has(membership.resident)
                      ? residentName(residentById.get(membership.resident)!)
                      : membership.resident}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Transfer destination
              <select
                required
                value={destinationHousehold}
                onChange={(event) =>
                  setDestinationHousehold(event.target.value)
                }
              >
                <option value="">Select another household</option>
                {households
                  .filter(
                    (household) =>
                      household.is_active && household.id !== householdId,
                  )
                  .map((household) => (
                    <option key={household.id} value={household.id}>
                      {household.label} ({household.reference})
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Effective date
              <input
                required
                type="date"
                value={transitionDate}
                onChange={(event) => setTransitionDate(event.target.value)}
              />
            </label>
            <div className="assignment-actions">
              <button
                disabled={saving || !managedMembership || !destinationHousehold}
                type="submit"
              >
                Transfer member
              </button>
              <button
                className="secondary"
                disabled={saving || !managedMembership}
                type="button"
                onClick={endMember}
              >
                End membership on this date
              </button>
            </div>
            <small>
              A transfer starts the destination membership on this date. Ending
              closes the current record on this date.
            </small>
          </form>
        )}

        {memberships.some((membership) => membership.valid_to) && (
          <details>
            <summary>Membership history</summary>
            <div className="assignment-history">
              {memberships
                .filter((membership) => membership.valid_to)
                .map((membership) => (
                  <p key={membership.id}>
                    {residentById.has(membership.resident)
                      ? residentName(residentById.get(membership.resident)!)
                      : membership.resident}
                    : {membership.valid_from} to {membership.valid_to}
                  </p>
                ))}
            </div>
          </details>
        )}
      </section>

      <section
        className="household-detail-card"
        aria-labelledby="occupancy-heading"
      >
        <h2 id="occupancy-heading">
          <Building2 size={19} /> Housing assignment
        </h2>
        <p>
          {currentOccupancy
            ? `Currently assigned to ${unitById.get(currentOccupancy.housing_unit)?.label ?? currentOccupancy.housing_unit} since ${currentOccupancy.valid_from}.`
            : "No current housing unit is assigned."}
        </p>
        <form className="assignment-form" onSubmit={moveHousehold}>
          <label>
            Housing unit
            <select
              required
              value={housingUnit}
              onChange={(event) => setHousingUnit(event.target.value)}
            >
              <option value="">Select housing unit</option>
              {units
                .filter((unit) => unit.is_active)
                .map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label} ({unit.reference})
                  </option>
                ))}
            </select>
          </label>
          <label>
            Move effective date
            <input
              required
              type="date"
              value={moveDate}
              onChange={(event) => setMoveDate(event.target.value)}
            />
          </label>
          <button disabled={saving} type="submit">
            {currentOccupancy ? "Move household" : "Assign housing unit"}
          </button>
        </form>
        {occupancies.some((occupancy) => occupancy.valid_to) && (
          <details>
            <summary>Housing history</summary>
            <div className="assignment-history">
              {occupancies
                .filter((occupancy) => occupancy.valid_to)
                .map((occupancy) => (
                  <p key={occupancy.id}>
                    {unitById.get(occupancy.housing_unit)?.label ??
                      occupancy.housing_unit}
                    : {occupancy.valid_from} to {occupancy.valid_to}
                  </p>
                ))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
