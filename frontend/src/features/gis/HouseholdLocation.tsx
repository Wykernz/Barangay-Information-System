import { useEffect, useState } from "react";
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
  useEffect(() => {
    let active = true;
    gisApi
      .households()
      .then((value) => {
        if (active) setRows(value);
      })
      .catch(() => {
        if (active)
          setError(
            "Database household locations are unavailable or access is not assigned.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="panel">
      <h2>Database household locations</h2>
      <p>
        These records are saved in PostgreSQL, separately from the sample
        directory.
      </p>
      {error && <p role="status">{error}</p>}
      {!error && !rows.length && <p>No database households found.</p>}
      {rows.map((row) => (
        <div className="quality-row" key={row.id}>
          <Link to={householdUrl(row.id)}>
            {row.label} · {row.reference}
          </Link>
          <span>
            {row.location ? "Location recorded" : "Location not recorded"}
          </span>
          <Link to={householdMapUrl(row.id)}>View on Map</Link>
        </div>
      ))}
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
      <Link to="/households">Back to household directory</Link>
      <h1>{row?.label ?? "Household information"}</h1>
      {error && <p role="alert">{error}</p>}
      {!error && !row && <p role="status">Loading household…</p>}
      {row && (
        <section className="panel">
          <p className="tag">Database record</p>
          <dl className="profile-details">
            <div>
              <dt>Reference</dt>
              <dd>{row.reference}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{row.is_active ? "Active" : "Inactive"}</dd>
            </div>
            <div>
              <dt>Housing unit</dt>
              <dd>{row.housing_label ?? "Not assigned"}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>
                {row.location
                  ? `${row.location.latitude}, ${row.location.longitude}`
                  : "Location not recorded"}
              </dd>
            </div>
            {row.location && (
              <div>
                <dt>Location verification</dt>
                <dd>{row.location.verification_status}</dd>
              </div>
            )}
          </dl>
          {row.occupancy_conflict && (
            <p role="alert">
              Multiple current housing assignments need review.
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
            <p>House number: {row.house_number || "Not numbered"}</p>
          )}
          <Link className="button" to={householdMapUrl(row.id)}>
            View on Map
          </Link>
          <Directions location={row.location} />
        </section>
      )}
    </>
  );
}
