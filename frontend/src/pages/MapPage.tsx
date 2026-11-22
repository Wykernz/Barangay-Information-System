import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { GeoJsonObject } from "geojson";
import axios from "axios";
import GeographicMap from "../features/gis/GeographicMap";
import HouseNumberEditor from "../features/gis/HouseNumberEditor";
import Directions from "../features/gis/Directions";
import {
  HazardLayerControls,
  useHazardLayers,
} from "../features/gis/HazardLayers";
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
  const hazards = useHazardLayers();
  const [params, setParams] = useSearchParams();
  const [configuration, setConfiguration] = useState<MapConfiguration | null>(
    null,
  );
  const [households, setHouseholds] = useState<MapHousehold[]>([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [householdLoadError, setHouseholdLoadError] = useState(false);
  const [boundary, setBoundary] = useState<Boundary | null>(null);
  const [boundaryFocus, setBoundaryFocus] = useState(0);
  const [boundaryError, setBoundaryError] = useState("");
  const [configurationError, setConfigurationError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
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
  const [occupancyFilter, setOccupancyFilter] = useState("all");
  const linkedUnits = new Map<string, boolean>();
  for (const row of households) {
    if (!row.housing_unit) continue;
    linkedUnits.set(
      row.housing_unit,
      (linkedUnits.get(row.housing_unit) ?? false) ||
        Boolean(
          row.location && row.location.verification_status !== "rejected",
        ),
    );
  }
  const mappedUnits = [...linkedUnits.values()].filter(Boolean).length;
  const searchKey = search.trim().toLowerCase();
  const visibleHouseholds = households.filter((row) => {
    const mapped = Boolean(
      row.location && row.location.verification_status !== "rejected",
    );
    return (
      (!unmapped || !mapped) &&
      (occupancyFilter === "all" ||
        row.is_active === (occupancyFilter === "active")) &&
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
          .includes(searchKey),
      )
    );
  });
  useEffect(() => {
    let active = true;
    let configured = false;
    setConfigurationError("");
    setBoundaryError("");
    setError("");
    setLoadingHouseholds(true);
    setHouseholdLoadError(false);
    setHouseholds([]);
    gisApi
      .config()
      .then((config) => {
        configured = true;
        if (active) setConfiguration(config);
        if (active) setProviderId(config.default_provider ?? "street");
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
      .catch((failure: unknown) => {
        if (!active) return;
        if (!configured) {
          const status = axios.isAxiosError(failure)
            ? failure.response?.status
            : undefined;
          setConfigurationError(
            status === 404
              ? "The running backend does not have the GIS endpoints. Restart the backend, then retry the map."
              : "Cannot load the map service. Check your connection and sign-in, then retry the map.",
          );
        } else {
          setBoundaryError(
            "Boundary unavailable. No boundary has been inferred.",
          );
        }
      });
    gisApi
      .households()
      .then((rows) => {
        if (active) {
          setHouseholds(rows);
          setLoadingHouseholds(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoadingHouseholds(false);
          setHouseholdLoadError(true);
          setError(
            "Cannot load database households. Check your permissions and connection.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);
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
      <div className="gis-page-heading">
        <div>
          <p className="eyebrow">GEOGRAPHIC INFORMATION</p>
          <h1>Housing map</h1>
          <p>
            Barangay Payahan, Calbayog City, Samar · Staff housing locations
          </p>
        </div>
        <span>Authorized staff workspace</span>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {configurationError && (
        <section className="panel" role="alert">
          <p>{configurationError}</p>
          {import.meta.env.DEV && (
            <pre>
              <code>
                {
                  ".\\scripts\\python.cmd scripts/dev.py runserver 127.0.0.1:8000"
                }
              </code>
            </pre>
          )}
          <button onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
            Retry map
          </button>
        </section>
      )}
      {!configuration && !configurationError && !boundaryError && (
        <p role="status">Loading map configuration…</p>
      )}
      {boundaryError && <p role="status">{boundaryError}</p>}
      {configuration && (
        <section className="panel gis-workspace-panel">
          <div className="gis-coverage" aria-label="Map coverage">
            <div>
              <strong>
                {loadingHouseholds || householdLoadError
                  ? "—"
                  : linkedUnits.size}
              </strong>
              <span>Linked housing units</span>
            </div>
            <div>
              <strong>
                {loadingHouseholds || householdLoadError ? "—" : mappedUnits}
              </strong>
              <span>Mapped units</span>
            </div>
            <div>
              <strong>
                {loadingHouseholds || householdLoadError
                  ? "—"
                  : linkedUnits.size - mappedUnits}
              </strong>
              <span>Unmapped linked units</span>
            </div>
            <div>
              <strong>
                {loadingHouseholds || householdLoadError
                  ? "—"
                  : households.filter((row) => !row.housing_unit).length}
              </strong>
              <span>Households without a unit</span>
            </div>
          </div>
          <details className="assignment-guide">
            <summary>How to assign a house</summary>
            <ol>
              <li>Select a database household from the map directory.</li>
              <li>
                Use Assign house number to record its existing number.
                Households sharing a house share its number.
              </li>
              <li>
                Choose Set house location, click the actual house and adjust the
                pin, then save with a location source.
              </li>
            </ol>
            <p>
              Pin saving requires GIS storage and location permissions. If no
              housing unit is assigned, link the household to its housing unit
              first. Sample profiling records are separate from database
              households.
            </p>
          </details>
          <HazardLayerControls state={hazards} />
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
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={item.available === false}
                  >
                    {item.label}
                    {item.url || (item.engine === "esri" && item.available)
                      ? ""
                      : " — setup required"}
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
          {configuration.providers.some(
            (item) => item.id === "hybrid" && item.available === false,
          ) && (
            <p role="status">
              Hybrid imagery and labels are ready for setup. An administrator
              must configure a licensed ArcGIS browser key; the street map
              remains available.
            </p>
          )}
          {!provider?.url && provider?.engine !== "esri" && (
            <p role="status">
              Satellite tiles require a licensed provider or licensed local tile
              package. Ask your administrator to configure this layer.
            </p>
          )}
          {provider?.note && <p role="status">{provider.note}</p>}
          {tileError && provider?.engine === "esri" && (
            <div role="alert">
              <p>
                Hybrid could not load. Check the ArcGIS key's validity,
                expiration, basemap permissions and allowed website settings.
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setProviderId("street");
                  setTileError(false);
                }}
              >
                Use Street map
              </button>
            </div>
          )}
          {tileError && provider?.engine !== "esri" && (
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
              hazard={
                hazards.data && hazards.selected
                  ? { data: hazards.data, layer: hazards.selected }
                  : null
              }
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
                  {configuration.can_number_houses && selected.housing_unit ? (
                    <HouseNumberEditor
                      key={selected.housing_unit}
                      unitId={selected.housing_unit}
                      number={selected.house_number ?? ""}
                      onSaved={(number) =>
                        setHouseholds((rows) =>
                          rows.map((row) =>
                            row.housing_unit === selected.housing_unit
                              ? { ...row, house_number: number }
                              : row,
                          ),
                        )
                      }
                    />
                  ) : (
                    <p>
                      House number: {selected.house_number || "Not numbered"}
                    </p>
                  )}
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
                  <Directions location={selected.location} />
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
                  {!configuration.can_edit &&
                    configuration.can_number_houses &&
                    selected.housing_unit &&
                    selected.is_active &&
                    !selected.occupancy_conflict && (
                      <div>
                        <button className="secondary" disabled>
                          Set house location
                        </button>
                        <p role="status">
                          {!configuration.gis_enabled
                            ? "Location saving is not configured on this server. Complete the one-time PostGIS setup first. After that, the admin can place and save house pins here without changing code."
                            : "Your account needs location capture and correction permissions to assign this house."}
                        </p>
                      </div>
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
                Find household, housing unit, or location
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Reference, house number, or coordinates"
                />
              </label>
              <label>
                Household status
                <select
                  value={occupancyFilter}
                  onChange={(event) => setOccupancyFilter(event.target.value)}
                >
                  <option value="all">All households</option>
                  <option value="active">Active households</option>
                  <option value="inactive">Inactive households</option>
                </select>
              </label>
              <p className="gis-filter-note">
                Purok filtering will be available when a reviewed purok field is
                stored with the database housing records.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={unmapped}
                  onChange={(event) => setUnmapped(event.target.checked)}
                />{" "}
                Unmapped or rejected locations
              </label>
              {visibleHouseholds.map((row) => (
                <div className="gis-household" key={row.id}>
                  <button
                    className="secondary"
                    disabled={saving}
                    onClick={() => select(row.id)}
                  >
                    {row.label}
                  </button>
                  <small>
                    {row.location?.verification_status === "rejected"
                      ? "Location rejected"
                      : row.location
                        ? "Location recorded"
                        : "Location not recorded"}
                  </small>
                </div>
              ))}
              {loadingHouseholds && <p role="status">Loading households…</p>}
              {!loadingHouseholds &&
                !householdLoadError &&
                !households.length && <p>No accessible database households.</p>}
              {!loadingHouseholds &&
                households.length > 0 &&
                !visibleHouseholds.length && (
                  <p>No households match the current filters.</p>
                )}
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
