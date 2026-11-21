/** Arbitrary test-only zones; never imported by application code or public assets. */
import type { HazardLayer } from "./hazards";
export const syntheticLayer: HazardLayer = {
  id: "synthetic-flood",
  kind: "flood",
  label: "Synthetic test only",
  url: "/maps/hazards/synthetic.geojson",
  source: "Synthetic test source",
  source_url: "https://example.test/source",
  source_date: "2026-11-20",
  licence_url: "https://example.test/licence",
  status: "indicative",
  legend: [
    {
      value: "source-high",
      label: "High (source classification)",
      color: "#cc2222",
    },
  ],
};
export const syntheticCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { risk_class: "source-high" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    },
  ],
};
