import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type HazardKind = "flood" | "fire";
export type HazardLegend = { value: string; label: string; color: string };
export type HazardLayer = {
  id: string;
  kind: HazardKind;
  label: string;
  url: string;
  source: string;
  source_url: string;
  source_date: string;
  licence_url: string;
  status: "indicative" | "locally_reviewed";
  review_authority?: string;
  legend: HazardLegend[];
};
export type HazardCollection = FeatureCollection<
  Polygon | MultiPolygon,
  { risk_class: string }
>;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function required(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function https(value: unknown): value is string {
  if (!required(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
export function parseHazardManifest(input: unknown): HazardLayer[] {
  if (!record(input) || input.version !== 1 || !Array.isArray(input.layers))
    throw Error("Invalid hazard layer manifest.");
  const ids = new Set<string>();
  for (const layer of input.layers) {
    if (
      !record(layer) ||
      !required(layer.id) ||
      ids.has(layer.id) ||
      !["flood", "fire"].includes(String(layer.kind)) ||
      !required(layer.label) ||
      !required(layer.url) ||
      !/^\/maps\/hazards\/[a-zA-Z0-9_-]+\.geojson$/.test(layer.url) ||
      !required(layer.source) ||
      !https(layer.source_url) ||
      !required(layer.source_date) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(layer.source_date) ||
      Number.isNaN(Date.parse(layer.source_date)) ||
      !https(layer.licence_url) ||
      !["indicative", "locally_reviewed"].includes(String(layer.status)) ||
      (layer.status === "locally_reviewed" &&
        !required(layer.review_authority)) ||
      !Array.isArray(layer.legend) ||
      !layer.legend.length
    ) {
      throw Error(
        "Hazard layers require source, licence, review status and a local GeoJSON file.",
      );
    }
    const classes = new Set<string>();
    for (const item of layer.legend) {
      if (
        !record(item) ||
        !required(item.value) ||
        classes.has(item.value) ||
        !required(item.label) ||
        typeof item.color !== "string" ||
        !/^#[0-9a-fA-F]{6}$/.test(item.color)
      )
        throw Error(
          "Every source classification needs a unique legend entry and hex color.",
        );
      classes.add(item.value);
    }
    ids.add(layer.id);
  }
  return input.layers as HazardLayer[];
}

function ringValid(ring: unknown): boolean {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  if (
    !ring.every(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        typeof point[0] === "number" &&
        Number.isFinite(point[0]) &&
        Math.abs(point[0]) <= 180 &&
        typeof point[1] === "number" &&
        Number.isFinite(point[1]) &&
        Math.abs(point[1]) <= 90,
    )
  )
    return false;
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}
export function parseHazardCollection(
  input: unknown,
  layer: HazardLayer,
): HazardCollection {
  if (
    !record(input) ||
    input.type !== "FeatureCollection" ||
    !Array.isArray(input.features) ||
    input.features.length > 10000 ||
    "crs" in input
  )
    throw Error("Use WGS84 GeoJSON polygon features.");
  for (const feature of input.features) {
    const riskClass =
      record(feature) && record(feature.properties)
        ? feature.properties.risk_class
        : null;
    if (
      !record(feature) ||
      feature.type !== "Feature" ||
      !record(feature.properties) ||
      !layer.legend.some((entry) => entry.value === riskClass) ||
      !record(feature.geometry)
    )
      throw Error(
        "A source risk classification and polygon are required for every feature.",
      );
    const geometry = feature.geometry;
    const polygons =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.type === "MultiPolygon"
          ? geometry.coordinates
          : null;
    if (
      !Array.isArray(polygons) ||
      !polygons.length ||
      !polygons.every(
        (polygon) =>
          Array.isArray(polygon) &&
          polygon.length > 0 &&
          polygon.every(ringValid),
      )
    )
      throw Error(
        "Hazard geometry must contain valid closed WGS84 polygon rings.",
      );
  }
  return input as unknown as HazardCollection;
}
