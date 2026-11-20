import { expect, test } from "vitest";
import { parseHazardCollection, parseHazardManifest } from "./hazards";
import { syntheticLayer, syntheticCollection } from "./hazardFixtures";
test("empty manifest means no assessments, never fabricated safe zones", () => {
  expect(parseHazardManifest({ version: 1, layers: [] })).toEqual([]);
});
test("source classifications and original coordinates are preserved", () => {
  expect(parseHazardManifest({ version: 1, layers: [syntheticLayer] })).toEqual(
    [syntheticLayer],
  );
  expect(parseHazardCollection(syntheticCollection, syntheticLayer)).toBe(
    syntheticCollection,
  );
});
test.each([
  { source: "" },
  { licence_url: "" },
  { source_url: "javascript:bad" },
  { status: "locally_reviewed" },
  { url: "https://example.test/polygons.geojson" },
  {
    legend: [
      { value: "source-high", label: "High", color: "red;display:none" },
    ],
  },
])(
  "reject missing provenance, unreviewed claims or unsafe asset definitions: %j",
  (change) => {
    expect(() =>
      parseHazardManifest({
        version: 1,
        layers: [{ ...syntheticLayer, ...change }],
      }),
    ).toThrow();
  },
);
test.each([
  { type: "Point", coordinates: [0, 0] },
  {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 2],
      ],
    ],
  },
  {
    type: "Polygon",
    coordinates: [
      [
        [181, 0],
        [1, 0],
        [1, 1],
        [181, 0],
      ],
    ],
  },
])("reject malformed or non-polygon risk zones", (geometry) => {
  expect(() =>
    parseHazardCollection(
      {
        ...syntheticCollection,
        features: [{ ...syntheticCollection.features[0], geometry }],
      },
      syntheticLayer,
    ),
  ).toThrow();
});
test("unknown source categories require explicit mapping rather than inferred severity", () => {
  expect(() =>
    parseHazardCollection(
      {
        ...syntheticCollection,
        features: [
          {
            ...syntheticCollection.features[0],
            properties: { risk_class: "unmapped-class" },
          },
        ],
      },
      syntheticLayer,
    ),
  ).toThrow();
});
