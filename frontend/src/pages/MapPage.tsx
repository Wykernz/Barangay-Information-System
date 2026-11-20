import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { GeoJsonObject } from "geojson";
import axios from "axios";
import GeographicMap from "../features/gis/GeographicMap";
import {
  gisApi,
  householdUrl,
  type MapConfiguration,
  type MapHousehold,
  type Position,
} from "../features/gis/api";

type Boundary = GeoJsonObject & {
  bbox?: [number, number, number, number];
  metadata?: {
    status: string;
    source_url: string;
    licence: string;
    source_date: string;
  };
};

export default function MapPage() {
  const [params, setParams] = useSearchParams();
  const [configuration, setConfiguration] = useState<MapConfiguration | null>(
    null,
  );
  const [households, setHouseholds] = useState<MapHousehold[]>([]);
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  const [boundaryFocus, setBoundaryFocus] = useState(0);
  const [boundaryError, setBoundaryError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [providerId, setProviderId] = useState("street");
  const [tileError, setTileError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Position | null>(null);
  const [source, setSource] = useState("");
  const [accuracy, setAccuracy] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedId = params.get("household");
  const selected = households.find((row) => row.id === selectedId);
  const provider = configuration?.providers.find(
    (item) => item.id === providerId,
  );
  const centerOutsideBoundary =
    configuration &&
    boundary?.bbox &&
    (configuration.center[1] < boundary.bbox[0] ||
      configuration.center[1] > boundary.bbox[2] ||
      configuration.center[0] < boundary.bbox[1] ||
      configuration.center[0] > boundary.bbox[3]);
  const [search, setSearch] = useState("");
  const [unmapped, setUnmapped] = useState(false);
  useEffect(() => {
    let active = true;
    gisApi
      .config()
      .then((config) => {
        if (active) setConfiguration(config);
        return fetch(config.boundary_url);
      })
      .then(async (response) => {
        if (!response.ok) throw Error("Boundary unavailable");
        const data = (await response.json()) as Boundary;
        if (
          data.type !== "FeatureCollection" ||
          data.metadata?.status !== "indicative"
        ) {
          throw Error("Boundary metadata needs review");
        }
        if (active) setBoundary(data);
      })
      .catch(() => {
        if (active)
          setBoundaryError(
            "Map configuration or boundary unavailable. No boundary has been inferred.",
          );
      });
    gisApi
      .households()
      .then((rows) => {
        if (active) setHouseholds(rows);
      })
      .catch(() => {
        if (active)
          setError(
            "Cannot load database households. Check your permissions and connection.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setMessage("");
  }, [selectedId]);
  function select(id: string) {
    if (!saving) setParams({ household: id });
  }
  async function save() {
    if (!selected || !draft || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await gisApi.save(selected, draft, source, accuracy);
      setHouseholds((rows) =>
        rows.map((row) =>
          row.housing_unit === saved.housing_unit
            ? { ...row, location: saved.location }
            : row,
        ),
      );
      setEditing(false);
      setDraft(null);
      setMessage(
        "House location saved to the database. Verification is still required.",
      );
    } catch (failure) {
      const status = axios.isAxiosError(failure)
        ? failure.response?.status
        : undefined;
      setError(
        status === 409
          ? "Location changed. Reload before trying again."
          : "Location was not saved. Check access, housing assignment, source and coordinates.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <p className="eyebrow">GEOGRAPHIC INFORMATION</p>
      <h1>Housing map</h1>
      <p>
        Barangay Payahan, Calbayog City, Samar · House locations require staff
        assignment.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!configuration && !boundaryError && (
        <p role="status">Loading map configuration…</p>
      )}
      {boundaryError && <p role="status">{boundaryError}</p>}
      {configuration && (
        <section className="panel">
          <div className="toolbar">
            {boundary && (
              <button
                className="secondary"
                onClick={() => setBoundaryFocus((value) => value + 1)}
              >
                Show Payahan boundary
              </button>
            )}
            <label>
              Map layer{" "}
              <select
                value={providerId}
                onChange={(event) => {
                  setProviderId(event.target.value);
                  setTileError(false);
                }}
              >
                {configuration.providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                    {item.url ? "" : " — setup required"}
                  </option>
                ))}
              </select>
            </label>
            <span>
              {provider?.offline
                ? "Local offline tiles"
                : "Online tiles — internet required"}
            </span>
          </div>
          {!provider?.url && (
            <p role="status">
              Satellite tiles require a licensed provider or licensed local tile
              package. Ask your administrator to configure this layer.
            </p>
          )}
          {provider?.note && <p role="status">{provider.note}</p>}
          {tileError && (
            <p role="status">
              Some tiles could not load. Check connectivity, provider access or
              local coverage.
            </p>
          )}
          {!configuration.gis_enabled && (
            <p role="status">
              Database mapping requires PostGIS, GDAL and GEOS. Locations cannot
              be saved yet.
            </p>
          )}
          {boundary?.metadata && (
            <p className="tag">
              Dashed outline: indicative Payahan boundary · Not officially
              verified locally · Source {boundary.metadata.source_date} ·{" "}
              <a
                href={boundary.metadata.source_url}
                target="_blank"
                rel="noreferrer"
              >
                Dataset and provenance
              </a>
            </p>
          )}
          <div className="gis-layout">
            <GeographicMap
              configuration={configuration}
              provider={provider}
              households={households}
              selected={selected}
              draft={draft}
              editing={
                editing && !saving && (provider?.max_native_zoom ?? 0) >= 18
              }
              boundary={boundary}
              boundaryFocus={boundaryFocus}
              onSelect={select}
              onPosition={setDraft}
              onTileError={() => setTileError(true)}
            />
            <div
              className="gis-sidebar"
              role="complementary"
              aria-label="Household map details"
            >
              {selectedId && !selected && (
                <p role="status">
                  This household is unavailable in the database map directory.
                  Sample profiles are not database records.
                </p>
              )}
              {selected && (
                <>
                  <h2>{selected.label}</h2>
                  <p>{selected.reference}</p>
                  <p>
                    Housing unit: {selected.housing_label ?? "Not assigned"}
                  </p>
                  <p>
                    {selected.location
                      ? `${selected.location.latitude}, ${selected.location.longitude} · ${selected.location.verification_status}`
                      : "Location not recorded"}
                  </p>
                  {selected.location && (
                    <p>
                      Source: {selected.location.source} · Accuracy:{" "}
                      {selected.location.accuracy_m
                        ? `${selected.location.accuracy_m} m`
                        : "Not recorded"}
                    </p>
                  )}
                  <Link to={householdUrl(selected.id)}>
                    View household details
                  </Link>
                  {households
                    .filter(
                      (row) =>
                        row.housing_unit &&
                        row.housing_unit === selected.housing_unit &&
                        row.id !== selected.id,
                    )
                    .map((row) => (
                      <p key={row.id}>
                        Also in this house:{" "}
                        <button
                          className="secondary"
                          disabled={saving}
                          onClick={() => select(row.id)}
                        >
                          {row.label}
                        </button>
                      </p>
                    ))}
                  {selected.occupancy_conflict && (
                    <p role="alert">
                      Review conflicting housing assignments before locating
                      this household.
                    </p>
                  )}
                  {configuration.can_edit &&
                    (provider?.max_native_zoom ?? 0) >= 18 &&
                    selected.housing_unit &&
                    selected.is_active &&
                    !selected.occupancy_conflict &&
                    !editing && (
                      <button
                        onClick={() => {
                          setEditing(true);
                          setDraft(selected.location);
                          setSource("");
                          setAccuracy("");
                        }}
                      >
                        Set house location
                      </button>
                    )}
                  {editing && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void save();
                      }}
                    >
                      <p>
                        Click the actual house, then drag the marker to adjust.
                        Saving updates all households sharing this housing unit.
                      </p>
                      <fieldset disabled={saving}>
                        <legend>Proposed location</legend>
                        <p>
                          {draft
                            ? `${draft.latitude.toFixed(6)}, ${draft.longitude.toFixed(6)}`
                            : "Click the map to select a point."}
                        </p>
                        <label>
                          Location source
                          <input
                            value={source}
                            onChange={(event) => setSource(event.target.value)}
                            maxLength={200}
                            required
                          />
                        </label>
                        <label>
                          Accuracy in metres (if known)
                          <input
                            type="number"
                            min="0"
                            max="999999.99"
                            step="0.01"
                            value={accuracy}
                            onChange={(event) =>
                              setAccuracy(event.target.value)
                            }
                          />
                        </label>
                        <button disabled={!draft || !source.trim()}>
                          {saving ? "Saving…" : "Save location"}
                        </button>
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => {
                            setEditing(false);
                            setDraft(null);
                          }}
                        >
                          Cancel
                        </button>
                      </fieldset>
                    </form>
                  )}
                </>
              )}
              <h2>Household directory</h2>
              <label>
                Find household
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={unmapped}
                  onChange={(event) => setUnmapped(event.target.checked)}
                />{" "}
                Locations not recorded
              </label>
              {households
                .filter(
                  (row) =>
                    (!unmapped || !row.location) &&
                    `${row.label} ${row.reference}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .map((row) => (
                  <div className="gis-household" key={row.id}>
                    <button
                      className="secondary"
                      disabled={saving}
                      onClick={() => select(row.id)}
                    >
                      {row.label}
                    </button>
                    <small>
                      {row.location
                        ? "Location recorded"
                        : "Location not recorded"}
                    </small>
                  </div>
                ))}
              {!households.length && <p>No accessible database households.</p>}
            </div>
          </div>
          {provider?.licence && (
            <p>
              <a href={provider.licence} target="_blank" rel="noreferrer">
                Provider licence and usage terms
              </a>
            </p>
          )}
        </section>
      )}
      {centerOutsideBoundary && (
        <p role="status">
          The requested starting view is outside this dataset’s boundary extent.
          Choose Show Payahan boundary to view the published outline.
        </p>
      )}
    </>
  );
}
