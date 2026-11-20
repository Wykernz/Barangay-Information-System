import { useState } from "react";
import { useDemo } from "../demo/store";
import { Link } from "react-router-dom";
import { BUILDING_USE_OPTIONS } from "../features/profiling/buildingUses";

export default function MapPage() {
  const { records } = useDemo();
  const [filter, setFilter] = useState("All");
  const [buildingUse, setBuildingUse] = useState("");
  const visibleUnits = records.housing
    .filter((row) => filter === "All" || row.water === filter)
    .filter(
      (row) =>
        !buildingUse || (row.buildingUse || "Not recorded") === buildingUse,
    );
  return (
    <>
      <p className="eyebrow">GEOGRAPHIC INFORMATION</p>
      <h1>Housing map</h1>
      <p className="muted">
        Locate housing units after geographic data has been verified.
      </p>
      <section className="panel">
        <div className="toolbar">
          <label>
            Building use
            <select
              value={buildingUse}
              onChange={(event) => setBuildingUse(event.target.value)}
            >
              <option value="">All building uses</option>
              {BUILDING_USE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Water source
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option>All</option>
              <option>Piped</option>
              <option>Well</option>
            </select>
          </label>
        </div>
        <div className="map-placeholder">
          <div className="map-message">
            <span className="tag">No geographic layer loaded</span>
            <h2>Verified locations start here</h2>
            <p>
              Upload and approve boundaries and housing coordinates through the
              future GIS workflow. No official map or house locations are
              assumed.
            </p>
          </div>
        </div>
        <h2>Unmapped housing directory</h2>
        {visibleUnits.map((row) => (
          <div className="quality-row" key={row.id}>
            <span>
              <Link to={`/housing/${row.id}`}>{row.name}</Link> ·{" "}
              {row.buildingUse || "Not recorded"} · {row.water}
            </span>
            <span className="badge">{row.status}</span>
          </div>
        ))}
        {!visibleUnits.length && (
          <p className="muted">No housing units match these filters.</p>
        )}
      </section>
    </>
  );
}
