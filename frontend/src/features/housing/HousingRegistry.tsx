import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPinned,
  Plus,
  Search,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { householdMapUrl, householdUrl, type MapHousehold } from "../gis/api";

type HousingUnit = {
  id: string;
  reference: string;
  label: string;
  house_number: string;
  address_text: string;
  is_active: boolean;
};
type Page<T> = {
  count: number;
  results: T[];
  next: string | null;
  previous: string | null;
};
type HousingSummary = {
  housing_units: number;
  occupied_units: number;
  mapped_units: number | null;
};
type Occupancy = {
  id: string;
  household: string;
  housing_unit: string;
  valid_from: string;
  valid_to: string | null;
};
type HouseholdLink = Pick<
  MapHousehold,
  "id" | "label" | "reference" | "location"
>;
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
    new Date(),
  );
async function allPages<T>(
  url: string,
  params: Record<string, string | number> = {},
) {
  const result: T[] = [];
  let page = 1;
  while (true) {
    const response = await api.get<Page<T>>(url, {
      params: { ...params, page },
    });
    result.push(...response.data.results);
    if (!response.data.next) return result;
    page += 1;
  }
}

export function HousingUnitDirectory() {
  const [rows, setRows] = useState<HousingUnit[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [summary, setSummary] = useState<HousingSummary | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .get<Page<HousingUnit>>("housing-units/", { params: { page } })
      .then(({ data }) => {
        if (!active) return;
        setRows(data.results);
        setCount(data.count);
        setNext(data.next);
        setPrevious(data.previous);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(
          "Housing unit records are unavailable or your account does not have access.",
        );
        setLoading(false);
      });
    api
      .get<HousingSummary>("overview/")
      .then(({ data }) => {
        if (active) setSummary(data);
      })
      .catch(() => {
        if (active) setSummary(null);
      });
    return () => {
      active = false;
    };
  }, [page, refresh]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter(
      (unit) =>
        (status === "all" || unit.is_active === (status === "active")) &&
        [unit.reference, unit.label, unit.house_number, unit.address_text].some(
          (value) => value.toLowerCase().includes(needle),
        ),
    );
  }, [rows, search, status]);

  return (
    <section className="housing-registry">
      <header className="housing-page-heading">
        <div>
          <p className="eyebrow">COMMUNITY RECORDS / HOUSING</p>
          <h1>Housing units</h1>
          <p>
            Database records for physical housing units and their current
            household assignments.
          </p>
        </div>
        <button type="button" onClick={() => setCreateOpen((open) => !open)}>
          <Plus size={17} /> Add housing unit
        </button>
      </header>
      {createOpen && (
        <CreateHousingUnit
          onCancel={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            setPage(1);
            setRefresh((v) => v + 1);
          }}
        />
      )}
      <section className="housing-stat-grid" aria-label="Housing unit summary">
        <div>
          <Building2 size={19} />
          <span>Total units</span>
          <strong>
            {loading || error ? "—" : count.toLocaleString("en-PH")}
          </strong>
        </div>
        <div>
          <Building2 size={19} />
          <span>Occupied units</span>
          <strong>
            {typeof summary?.occupied_units === "number"
              ? summary.occupied_units.toLocaleString("en-PH")
              : "—"}
          </strong>
        </div>
        <div>
          <Building2 size={19} />
          <span>Vacant active units</span>
          <strong>
            {typeof summary?.housing_units === "number" &&
            typeof summary.occupied_units === "number"
              ? Math.max(
                  0,
                  summary.housing_units - summary.occupied_units,
                ).toLocaleString("en-PH")
              : "—"}
          </strong>
        </div>
        <div>
          <MapPinned size={19} />
          <span>Mapped units</span>
          <strong>
            {typeof summary?.mapped_units === "number"
              ? summary.mapped_units.toLocaleString("en-PH")
              : "—"}
          </strong>
        </div>
      </section>
      <section className="panel housing-directory-panel">
        <div className="housing-filter-bar">
          <label className="housing-search">
            <span>Search housing units</span>
            <div>
              <Search size={16} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Reference, label, house number, or address"
              />
            </div>
          </label>
          <label>
            Record status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <span className="housing-record-count">
            {loading || error ? "—" : `${count} records`}
          </span>
        </div>
        {!loading && !error && (
          <p className="housing-page-note">
            Search applies to the current server page. Use pagination to browse
            all records.
          </p>
        )}
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {loading && <p role="status">Loading housing units…</p>}
        {!loading && !error && !rows.length && (
          <div className="housing-empty">
            <Building2 size={27} />
            <strong>No housing units recorded</strong>
            <span>
              Add an existing housing unit to begin linking household occupancy
              records.
            </span>
          </div>
        )}
        {!loading && !error && rows.length > 0 && !filtered.length && (
          <p className="housing-empty">
            No housing units match this page and filter.
          </p>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="housing-table-scroll">
            <table>
              <caption className="sr-only">
                Database housing units, page {page}
              </caption>
              <thead>
                <tr>
                  <th>Housing unit</th>
                  <th>House number</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((unit) => (
                  <tr key={unit.id}>
                    <td>
                      <Link to={`/housing/${unit.id}`}>{unit.label}</Link>
                      <small>{unit.reference}</small>
                    </td>
                    <td>{unit.house_number || "Not assigned"}</td>
                    <td>{unit.address_text || "Not recorded"}</td>
                    <td>
                      <span
                        className={`household-status ${unit.is_active ? "is-active" : ""}`}
                      >
                        {unit.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <Link to={`/housing/${unit.id}`}>
                        View details <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(next || previous) && (
          <nav className="housing-pagination" aria-label="Housing unit pages">
            <button
              className="secondary"
              disabled={!previous || loading}
              onClick={() => setPage((n) => n - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} · {count} total
            </span>
            <button
              className="secondary"
              disabled={!next || loading}
              onClick={() => setPage((n) => n + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </section>
  );
}

function CreateHousingUnit({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [label, setLabel] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.get("auth/csrf/");
      await api.post("housing-units/", {
        label: label.trim(),
        house_number: houseNumber.trim(),
        address_text: address.trim(),
      });
      onCreated();
    } catch (failure) {
      const response = (
        failure as {
          response?: { status?: number; data?: Record<string, unknown> };
        }
      ).response;
      setError(
        response?.status === 403
          ? "You do not have permission to add housing units."
          : response?.status === 400
            ? "Check the housing unit details and try again."
            : "The housing unit was not saved. Check your connection and try again.",
      );
      setSaving(false);
    }
  }
  return (
    <form className="panel housing-create-form" onSubmit={submit}>
      <div>
        <h2>Add a housing unit</h2>
        <p>
          Enter an actual housing unit. Its reference is generated by the
          system.
        </p>
      </div>
      <div className="housing-create-fields">
        <label>
          Housing unit label{" "}
          <input
            required
            maxLength={150}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Payahan residence"
          />
        </label>
        <label>
          House number{" "}
          <input
            maxLength={50}
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label>
          Address{" "}
          <input
            maxLength={500}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street or sitio details"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <div className="housing-form-actions">
        <button
          type="button"
          className="secondary"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save housing unit"}
        </button>
      </div>
    </form>
  );
}

export function HousingUnitDetail() {
  const { id = "" } = useParams();
  const [unit, setUnit] = useState<HousingUnit | null>(null);
  const [occupancies, setOccupancies] = useState<Occupancy[]>([]);
  const [households, setHouseholds] = useState<HouseholdLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      api.get<HousingUnit>(`housing-units/${encodeURIComponent(id)}/`),
      allPages<Occupancy>("household-occupancies/", { housing_unit: id }),
      allPages<HouseholdLink>("households/").catch(() => []),
      allPages<MapHousehold>("gis/households/").catch(() => []),
    ])
      .then(([unitResponse, occupancyResponse, householdRows, mapRows]) => {
        if (!active) return;
        setUnit(unitResponse.data);
        setOccupancies(occupancyResponse);
        const mapById = new Map(mapRows.map((row) => [row.id, row]));
        setHouseholds(
          householdRows.map((household) => ({
            ...household,
            location: mapById.get(household.id)?.location ?? null,
          })),
        );
        setLoading(false);
      })
      .catch((failure: { response?: { status?: number } }) => {
        if (!active) return;
        setError(
          failure.response?.status === 404
            ? "This housing unit was not found."
            : "Housing unit details are unavailable or your account does not have access.",
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  const current = occupancies.filter(
    (item) =>
      item.valid_from <= today() &&
      (!item.valid_to || item.valid_to >= today()),
  );
  const linkedHouseholds = current.map((occupancy) => ({
    occupancy,
    household: households.find((item) => item.id === occupancy.household),
  }));
  return (
    <>
      <div className="housing-detail-heading">
        <Link to="/housing">
          <ArrowLeft size={16} /> Back to housing units
        </Link>
        <span>COMMUNITY RECORDS / HOUSING UNITS</span>
      </div>
      <header className="housing-page-heading housing-detail-title">
        <div>
          <p className="eyebrow">HOUSING UNIT PROFILE</p>
          <h1>{unit?.label ?? "Housing unit details"}</h1>
          <p>Saved housing details and effective household occupancy.</p>
        </div>
        {unit && (
          <span
            className={`household-status ${unit.is_active ? "is-active" : ""}`}
          >
            {unit.is_active ? "Active" : "Inactive"}
          </span>
        )}
      </header>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading housing unit…</p>}
      {unit && (
        <div className="housing-detail-grid">
          <section className="panel housing-detail-card">
            <h2>
              <Building2 size={19} /> Housing information
            </h2>
            <dl>
              <div>
                <dt>Unit reference</dt>
                <dd>{unit.reference}</dd>
              </div>
              <div>
                <dt>House number</dt>
                <dd>{unit.house_number || "Not assigned"}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{unit.address_text || "Not recorded"}</dd>
              </div>
              <div>
                <dt>Record status</dt>
                <dd>{unit.is_active ? "Active" : "Inactive"}</dd>
              </div>
            </dl>
          </section>
          <section className="panel housing-detail-card housing-occupancy-card">
            <h2>
              <Building2 size={19} /> Current household occupancy{" "}
              <span>{current.length}</span>
            </h2>
            {!current.length ? (
              <p>No effective household occupancy is recorded for this unit.</p>
            ) : (
              <div className="housing-linked-list">
                {linkedHouseholds.map(({ occupancy, household }) => (
                  <article key={occupancy.id}>
                    <div>
                      <strong>{household?.label ?? "Household record"}</strong>
                      <small>
                        {household?.reference ?? occupancy.household} · Since{" "}
                        {occupancy.valid_from}
                      </small>
                    </div>
                    {household && (
                      <div className="housing-actions">
                        <Link to={householdUrl(household.id)}>
                          View household
                        </Link>
                        {household.location && (
                          <Link to={householdMapUrl(household.id)}>
                            <MapPinned size={15} /> View on map
                          </Link>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
            <p className="housing-data-note">
              Past occupancy periods are retained in the database; this panel
              shows periods effective today.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
