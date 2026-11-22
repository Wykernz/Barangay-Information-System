import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  House,
  MapPinned,
  Search,
  UsersRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  gisApi,
  householdMapUrl,
  householdUrl,
  type MapHousehold,
} from "./api";
import HouseNumberEditor from "./HouseNumberEditor";
import Directions from "./Directions";

export function DatabaseHouseholdDirectory() {
  const [rows, setRows] = useState<MapHousehold[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [location, setLocation] = useState("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    gisApi
      .householdPage(page)
      .then((value) => {
        if (active) {
          setRows(value.results);
          setTotalCount(value.count);
          setNextPage(value.next);
          setPreviousPage(value.previous);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setError(
            "Database household locations are unavailable or access is not assigned.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [page]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      const hasLocation = Boolean(
        row.location && row.location.verification_status !== "rejected",
      );
      return (
        (status === "all" || row.is_active === (status === "active")) &&
        (location === "all" || hasLocation === (location === "mapped")) &&
        [
          row.label,
          row.reference,
          row.housing_unit,
          row.housing_label,
          row.house_number,
          row.location?.source,
          row.location?.latitude,
          row.location?.longitude,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(needle),
        )
      );
    });
  }, [rows, search, status, location]);
  const mappedUnits = new Set(
    rows
      .filter(
        (row) =>
          row.housing_unit &&
          row.location &&
          row.location.verification_status !== "rejected",
      )
      .map((row) => row.housing_unit),
  ).size;
  return (
    <section
      className="household-registry"
      aria-label="Database household registry"
    >
      <div className="household-stat-grid">
        <div>
          <House size={19} />
          <span>Total households</span>
          <strong>{loading || error ? "—" : totalCount}</strong>
        </div>
        <div>
          <UsersRound size={19} />
          <span>Active households</span>
          <strong>—</strong>
        </div>
        <div>
          <House size={19} />
          <span>Current members</span>
          <strong>—</strong>
        </div>
        <div>
          <MapPinned size={19} />
          <span>Mapped in this page</span>
          <strong>{loading || error ? "—" : mappedUnits}</strong>
        </div>
      </div>
      <section className="panel household-directory-panel">
        <div className="household-directory-heading">
          <div>
            <h2>Household registry</h2>
            <p>Database records and current housing assignments</p>
          </div>
          <span>{loading || error ? "—" : `${totalCount} records`}</span>
        </div>
        <div className="household-filter-bar">
          <label className="household-search">
            <span>Search households</span>
            <div>
              <Search size={16} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Household, reference, housing unit, house number, or location"
              />
            </div>
          </label>
          <label>
            Household status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            Housing location
            <select
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All locations</option>
              <option value="mapped">Mapped</option>
              <option value="unmapped">Unmapped</option>
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {!loading && !error && (
          <p className="household-filter-note">
            Search and filters apply to this server page. Use pagination to
            browse the full registry.
          </p>
        )}
        {loading && <p role="status">Loading database households…</p>}
        {!loading && !error && !rows.length && (
          <div className="household-empty">
            <House size={25} />
            <strong>No database households yet</strong>
            <span>
              Households registered by authorized staff will appear here.
            </span>
          </div>
        )}
        {!loading && !error && rows.length > 0 && !filtered.length && (
          <p className="household-empty">No households match these filters.</p>
        )}
        {rows.length > 0 && (
          <div className="household-table-scroll">
            <table>
              <caption className="sr-only">
                Database household registry, page {page}
              </caption>
              <thead>
                <tr>
                  <th>Household</th>
                  <th>Household head</th>
                  <th>Purok</th>
                  <th>Members</th>
                  <th>Families</th>
                  <th>Housing unit</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={householdUrl(row.id)}>{row.reference}</Link>
                      <small>{row.label}</small>
                    </td>
                    <td>Not available</td>
                    <td>Not recorded</td>
                    <td>Not available</td>
                    <td>Not available</td>
                    <td>
                      {row.housing_label ?? "Not assigned"}
                      {row.house_number && (
                        <small>House {row.house_number}</small>
                      )}
                    </td>
                    <td>
                      <span
                        className={`household-status ${row.is_active ? "is-active" : ""}`}
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {row.location?.verification_status === "rejected"
                        ? "Rejected"
                        : row.location
                          ? "Mapped"
                          : "Unmapped"}
                    </td>
                    <td>
                      <div className="household-row-actions">
                        <Link to={householdUrl(row.id)}>View</Link>
                        <Link to={householdMapUrl(row.id)}>Map</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(nextPage || previousPage) && (
          <nav
            className="household-pagination"
            aria-label="Household registry pages"
          >
            <button
              className="secondary"
              disabled={!previousPage || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <span>
              Page {page}
              {totalCount ? ` · ${totalCount} total` : ""}
            </span>
            <button
              className="secondary"
              disabled={!nextPage || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </section>
  );
}

export function DatabaseHouseholdDetail() {
  const { id = "" } = useParams();
  const [row, setRow] = useState<MapHousehold | null>(null);
  const [canNumber, setCanNumber] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setRow(null);
    setError("");
    gisApi
      .config()
      .then((config) => {
        if (active) setCanNumber(!!config.can_number_houses);
      })
      .catch(() => {
        if (active) setCanNumber(false);
      });
    gisApi
      .household(id)
      .then((value) => {
        if (active) setRow(value);
      })
      .catch(() => {
        if (active)
          setError("Household unavailable. Check your access and connection.");
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <>
      <div className="household-detail-heading">
        <Link to="/households">
          <ArrowLeft size={16} aria-hidden="true" /> Back to households
        </Link>
        <span>COMMUNITY RECORDS / HOUSEHOLDS</span>
      </div>
      <div className="household-detail-title">
        <div>
          <p className="eyebrow">HOUSEHOLD PROFILE</p>
          <h1>{row?.label ?? "Household information"}</h1>
          <p>Household, housing assignment, and location summary.</p>
        </div>
        {row && (
          <span
            className={`household-status ${row.is_active ? "is-active" : ""}`}
          >
            {row.is_active ? "Active" : "Inactive"}
          </span>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {!error && !row && <p role="status">Loading household…</p>}
      {row && (
        <div className="household-detail-content">
          <section className="household-detail-summary">
            <div className="household-detail-icon">
              <House size={29} aria-hidden="true" />
            </div>
            <div>
              <span>Household reference</span>
              <strong>{row.reference}</strong>
              <small>Database record</small>
            </div>
            <div className="household-summary-actions">
              <Link className="button-link" to={householdMapUrl(row.id)}>
                <MapPinned size={16} aria-hidden="true" /> Go to map
              </Link>
            </div>
          </section>
          <section className="household-detail-card">
            <h2>
              <Building2 size={19} aria-hidden="true" /> Housing information
            </h2>
            <dl className="household-detail-grid">
              <div>
                <dt>Housing unit</dt>
                <dd>{row.housing_label ?? "Not assigned"}</dd>
              </div>
              <div>
                <dt>House number</dt>
                <dd>{row.house_number || "Not numbered"}</dd>
              </div>
              <div>
                <dt>Household status</dt>
                <dd>{row.is_active ? "Active" : "Inactive"}</dd>
              </div>
              <div>
                <dt>Current housing assignments</dt>
                <dd>
                  {row.occupancy_conflict
                    ? "Multiple assignments — review required"
                    : row.housing_unit
                      ? "One linked unit"
                      : "No unit assigned"}
                </dd>
              </div>
            </dl>
            {row.occupancy_conflict && (
              <p role="alert" className="notice">
                Multiple current housing assignments need review. The map will
                not choose one automatically.
              </p>
            )}
            {canNumber && row.housing_unit ? (
              <HouseNumberEditor
                key={row.housing_unit}
                unitId={row.housing_unit}
                number={row.house_number ?? ""}
                onSaved={(number) =>
                  setRow((current) =>
                    current ? { ...current, house_number: number } : current,
                  )
                }
              />
            ) : (
              <p>House number assignment requires housing unit edit access.</p>
            )}
          </section>
          <section className="household-detail-card">
            <h2>
              <MapPinned size={19} aria-hidden="true" /> GIS location
            </h2>
            <div className="household-location-info">
              <div>
                <span>Location status</span>
                <strong>
                  {row.location?.verification_status === "rejected"
                    ? "Rejected"
                    : row.location
                      ? "Recorded"
                      : "Not recorded"}
                </strong>
              </div>
              {row.location && (
                <>
                  <div>
                    <span>Coordinates</span>
                    <strong>
                      {row.location.latitude.toFixed(6)},{" "}
                      {row.location.longitude.toFixed(6)}
                    </strong>
                  </div>
                  <div>
                    <span>Verification</span>
                    <strong>{row.location.verification_status}</strong>
                  </div>
                  <div>
                    <span>Source</span>
                    <strong>{row.location.source}</strong>
                  </div>
                </>
              )}
            </div>
            <div className="household-detail-actions">
              <Link className="button-link" to={householdMapUrl(row.id)}>
                <MapPinned size={16} aria-hidden="true" />{" "}
                {row.location ? "View on map" : "View location on map"}
              </Link>
              <Directions location={row.location} />
            </div>
          </section>
          <section className="household-detail-card">
            <h2>
              <UsersRound size={19} aria-hidden="true" /> Household composition
            </h2>
            <p>
              Member and family details are not included in the current
              household directory API.
            </p>
            <div className="household-unavailable-grid">
              <div>
                <span>Household head</span>
                <strong>Unavailable</strong>
              </div>
              <div>
                <span>Members</span>
                <strong>Unavailable</strong>
              </div>
              <div>
                <span>Families</span>
                <strong>Unavailable</strong>
              </div>
              <div>
                <span>Purok</span>
                <strong>Not recorded</strong>
              </div>
            </div>
            <Link to="/households">
              Return to household registry{" "}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        </div>
      )}
    </>
  );
}
