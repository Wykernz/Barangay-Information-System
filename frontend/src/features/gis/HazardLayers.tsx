import { useEffect, useState } from "react";
import {
  parseHazardCollection,
  parseHazardManifest,
  type HazardCollection,
  type HazardLayer,
} from "./hazards";

async function localJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw Error("Layer unavailable");
  const content = await response.text();
  if (content.length > 10 * 1024 * 1024) throw Error("Layer exceeds 10 MB");
  return JSON.parse(content) as unknown;
}

export function useHazardLayers() {
  const [layers, setLayers] = useState<HazardLayer[]>([]);
  const [selection, setSelection] = useState("");
  const [data, setData] = useState<HazardCollection | null>(null);
  const [loadedId, setLoadedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = layers.find((layer) => layer.id === selection);
  useEffect(() => {
    let active = true;
    localJson("/maps/hazards/manifest.json")
      .then(parseHazardManifest)
      .then((value) => {
        if (active) setLayers(value);
      })
      .catch(() => {
        if (active)
          setError("Risk layer setup unavailable. Areas remain unassessed.");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setData(null);
    if (!selected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    localJson(selected.url)
      .then((value) => parseHazardCollection(value, selected))
      .then((value) => {
        if (active) {
          setLoadedId(selected.id);
          setData(value);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Risk layer could not be validated or loaded. Areas remain unassessed.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected]);
  return {
    layers,
    selection,
    setSelection,
    data: selected?.id === loadedId ? data : null,
    selected,
    error,
    loading,
  };
}

export function HazardLayerControls({
  state,
}: {
  state: ReturnType<typeof useHazardLayers>;
}) {
  return (
    <section className="hazard-controls" aria-label="Risk overlays">
      <h2>Area risk layers</h2>
      <label>
        Risk overlay
        <select
          value={state.selection}
          onChange={(event) => state.setSelection(event.target.value)}
        >
          <option value="">None</option>
          {!state.layers.some((layer) => layer.kind === "flood") && (
            <option value="pending-flood">
              Flood susceptibility — source pending
            </option>
          )}
          {!state.layers.some((layer) => layer.kind === "fire") && (
            <option value="pending-fire">
              Fire susceptibility — source pending
            </option>
          )}
          {state.layers.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.kind === "flood" ? "Flood" : "Fire"}: {layer.label}
            </option>
          ))}
        </select>
      </label>
      {state.selection.startsWith("pending-") && (
        <p role="status">
          No {state.selection === "pending-flood" ? "flood" : "fire"} dataset
          loaded. These areas are unassessed, not safe.
        </p>
      )}
      {state.loading && <p role="status">Loading risk polygons…</p>}
      {state.error && <p role="status">{state.error}</p>}
      {!state.layers.length && (
        <p>No sourced flood or fire polygons are loaded.</p>
      )}
      {state.selected && (
        <>
          <p>
            {state.selected.status === "locally_reviewed"
              ? `Locally reviewed by ${state.selected.review_authority}`
              : "Indicative — not locally verified"}
          </p>
          <p>
            Source:{" "}
            <a
              href={state.selected.source_url}
              target="_blank"
              rel="noreferrer"
            >
              {state.selected.source}
            </a>{" "}
            · {state.selected.source_date} ·{" "}
            <a
              href={state.selected.licence_url}
              target="_blank"
              rel="noreferrer"
            >
              Licence
            </a>
          </p>
          <ul
            className="hazard-legend"
            aria-label="Source risk classifications"
          >
            {state.selected.legend.map((item) => (
              <li key={item.value}>
                <span
                  className="hazard-swatch"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                {item.label}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted">
        Uncolored areas are unassessed. Flood susceptibility is not live water
        depth or a current flood alert. House marker colors indicate selection,
        not hazard.
      </p>
    </section>
  );
}
