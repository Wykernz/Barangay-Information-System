import { useState } from "react";
import { useDemo } from "../demo/store";

export default function MapPage() {
  const { records } = useDemo();
  const [filter, setFilter] = useState("All");
  return (
    <>
      <p className="eyebrow">GEOGRAPHIC INFORMATION</p>
      <h1>Housing map</h1>
      <p className="muted">
        Locate housing units after geographic data has been verified.
      </p>
      <section className="panel">
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
        {records.housing
          .filter((row) => filter === "All" || row.water === filter)
          .map((row) => (
            <div className="quality-row" key={row.id}>
              <span>
                {row.name} · {row.water}
              </span>
              <span className="badge">{row.status}</span>
            </div>
          ))}
      </section>
    </>
  );
}
