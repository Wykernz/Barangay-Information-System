# Payahan household map

The user authorized this increment on 2026-11-20. Initial view is latitude
12.0715, longitude 124.5922, zoom 18, exactly as supplied. This is a view setting,
not evidence of a house location or an official boundary.

## Records and navigation

Households remain separate from housing units. A coordinate is stored in the
existing PostGIS `HousingLocation.point` (EPSG:4326; x = longitude, y = latitude).
The household's currently effective `HouseholdOccupancy` resolves its house.
Several households can share one marker and point revision. No existing records
are migrated, removed, automatically matched by name, or copied from fixtures.

Household Profiling includes a **Database household locations** directory below
the existing sample directory. Open a database household and choose **View on
Map**. The selected house is highlighted at zoom 18. Click a house marker to
show household information, other households sharing that house, and **View
household details**. A household without a point displays **Location not recorded**;
one without exactly one effective housing assignment cannot receive a point.
Sample profiles remain session-only and are never represented as saved GIS data.

Authorized staff choose **Set house location**, click a house or drag the proposed
marker, supply the location source and optional known accuracy, then explicitly
save. Cancel discards the draft. Source is required; precision of numeric output
does not imply accuracy. A saved point starts **unverified**. Corrections append
revisions and preserve previous geometry/provenance. Parent-house locking protects
first-write races; expected location and housing IDs reject stale edits with 409.
All households sharing a house show its updated point after saving.

Read access requires `households.view_household`, `households.view_housingunit`,
`households.view_householdoccupancy` and, when GIS is enabled,
`gis.view_housinglocation`. Capture/correction additionally requires
`gis.add_housinglocation` and `gis.change_housinglocation`. Server checks are
authoritative; the existing health-worker isolation remains in force. No health
or complaint fields are returned by the map API. Existing GIS audit signals
record metadata without copying coordinates to audit payloads.

API routes under `/api/v1/gis/`: `config/`, paginated `households/`,
`households/<uuid>/`, and POST `households/<uuid>/location/`. POST takes latitude,
longitude, source, optional accuracy_m, expected_location (UUID or null) and
expected_housing_unit. Invalid coordinates, non-finite numbers, unassigned houses,
permission denial and stale edits never produce a successful save response.

## Native GIS setup

Keep the existing PostgreSQL database and credentials. Have the local database
administrator provision PostGIS in the dedicated development database; install
compatible GDAL/GEOS for GeoDjango, then set `DJANGO_ENABLE_GIS=true` in the ignored
backend environment. Follow the existing GIS migration/runtime instructions;
do not enable the flag on a workstation missing native libraries. This increment
does not install system libraries, change database extensions, run migrations or
modify real household records. With the flag false the geographic basemap can
display, but location saves are explicitly unavailable (503).

```powershell
.\scripts\python.cmd scripts/dev.py check
.\scripts\python.cmd scripts/dev.py migrate
.\scripts\python.cmd scripts/test_backend.py gis/test_household_map.py --reuse-db
```

Use an authorized separate test database. These integration tests are skipped
when the native GIS feature flag is off; that is not evidence of a live PostGIS
round trip. All test households and points are synthetic.

## Providers and licensing

Leaflet 1.9.4 and its styles are bundled locally; there is no JavaScript/CSS CDN.
The default street layer uses OpenStreetMap standard tiles, with attribution and
a copyright link. Online browsing must comply with the
[OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/).
There is no bulk downloader, proxy cache or service-worker tile caching.

The default satellite option is NASA GIBS Blue Marble Next Generation, a real
historical satellite composite at approximately 500 m resolution (native zoom 8).
The UI labels this limitation and disables point selection on this coarse layer.
It cannot identify roofs at zoom 18. See [NASA GIBS use guidance](https://nasa-gibs.github.io/gibs-api-docs/).
High-resolution satellite imagery requires an operator-provided licensed source,
for example an appropriately entitled MapTiler account/package. No account,
payment, entitlement or house-level imagery availability is inferred.

Provider overrides use `GIS_STREET_` and `GIS_SATELLITE_` prefixes:

| Suffix | Meaning |
|---|---|
| `URL` | HTTPS or same-origin XYZ template containing `{z}`, `{x}`, `{y}` |
| `ATTRIBUTION` | Required provider/data credit, rendered as text with a terms link |
| `LICENCE` | Required HTTPS provider/data terms URL |
| `MAX_NATIVE_ZOOM` | Actual source maximum detail, integer 0–20 (default 18 for overrides) |
| `OFFLINE` | `true` only for a licensed, locally hosted source; default false |

Store provider credentials only in ignored local configuration. Any tile key
sent to the browser is visible to staff; use a browser-scoped, origin-restricted
key, never a secret administrative token. Restart Django after configuration.
Read and comply with [MapTiler terms](https://www.maptiler.com/terms/) and
[attribution requirements](https://www.maptiler.com/copyright/) for that option.

## Offline LAN tiles

Obtain a tile package or render locally from data whose licence permits local
hosting. Do not download the coverage area from public OSM tiles. Prepare the
desired coverage and zoom levels in QGIS/an authorized tile tool, preserving the
provider licence, attribution, imagery date and coverage inventory privately.
No offline imagery is bundled or claimed to exist in this repository.

The authenticated local tile endpoint serves existing XYZ files only. Place
licensed street tiles at `.local/map-tiles/street/<z>/<x>/<y>.png` and satellite
tiles under `.local/map-tiles/satellite/` (png/jpg/jpeg supported). Override root
with `GIS_LOCAL_TILE_ROOT` if needed. Then configure, for example:

```text
GIS_STREET_URL=/api/v1/gis/tiles/street/{z}/{x}/{y}.png
GIS_STREET_ATTRIBUTION=Your licensed source credit
GIS_STREET_LICENCE=https://your-provider.example/actual-licence
GIS_STREET_MAX_NATIVE_ZOOM=18
GIS_STREET_OFFLINE=true
```

Use the actual licence URL and credits; the example is a placeholder. Repeat for
`GIS_SATELLITE_` with the correct imagery source. For larger deployments serve
tiles through the existing local reverse proxy. Missing files return 404 with a
visible map warning. The local boundary and bundled app assets require no internet.
Acceptance: disconnect WAN while retaining LAN, reload the app, switch both local
layers and inspect the coverage edges at every supported zoom. This requires
licensed tile packages and the running local application/database.

## Boundary provenance

The extract was obtained successfully: original HDX `phl_admin4.geojson`,
feature reference date `2025-02-13`, polygon with 23 coordinate positions and
closed ring. Original archive SHA-256:
`032db5d91fcb8a13aef378d6b4453da7225ef7f0fb9c0a1c3bf3c2205d0010d6`.
Its published extent is longitude 124.573939239–124.586093209 and latitude
12.080936609–12.092633867. The user-supplied initial center lies outside that
extent; it is preserved exactly, with a visible notice and **Show Payahan boundary**
action rather than moving or stretching the polygon. No inference about the
legally correct boundary or the intended starting point is made.

The boundary must be an unchanged extract of the named Payahan feature in the
[OCHA HDX Philippines administrative-boundaries dataset](https://data.humdata.org/dataset/cod-ab-phl).
Use the NAMRIA/PSA administrative code `PH0806003173`, municipality Calbayog City,
province Samar. Matching only the name Payahan is unsafe: other provinces have
barangays with that name. The investigated community release was simplified at
0.005 degrees and is deliberately not used as an unsimplified boundary.

`scripts/extract_payahan.py` extracts the original feature unchanged and records
archive SHA-256, source member, original attributes, licence and pending local
verification in `frontend/public/maps/payahan.geojson`. It streams features rather
than loading the country GeoJSON into memory. No geometry is manually drawn,
buffered, reconstructed from a centroid or simplified. The UI uses a dashed
indicative outline. Published government-derived data does not imply official
local boundary acceptance; LGU review, reference date and accuracy sign-off remain
open. If the extract cannot be retrieved/validated, the map displays boundary
unavailable and draws no replacement polygon.

```powershell
.\scripts\python.cmd scripts/extract_payahan.py .local/gis-source/hdx-original.zip frontend/public/maps/payahan.geojson
```

See the validation handoff appended here for commands actually executed.

## Validation handoff (2026-11-20)

Executed from the repository root unless noted:

- `.tools/python-packages/bin/ruff.exe check backend/households/map_config.py backend/households/map_views.py backend/households/test_map.py backend/households/test_boundary.py backend/gis/services.py backend/gis/test_household_map.py scripts/extract_payahan.py`: passed. Ruff formatting also applied to these files.
- `.\scripts\python.cmd scripts/test_backend.py households/test_map.py households/test_boundary.py households/tests.py gis/test_household_map.py --reuse-db -p no:cacheprovider`: **24 passed, 2 skipped**. Covers permissions, invalid/non-finite coordinates, disabled GIS, local tile paths, source provenance and missing-boundary handling. The skipped tests require native PostGIS and cover database revisions, shared houses and stale edits.
- `.\scripts\python.cmd scripts/dev.py check`: passed.
- `.\scripts\python.cmd scripts/dev.py makemigrations --check --dry-run`: no changes detected.
- `.\scripts\python.cmd scripts/dev.py spectacular --validate --file ../.local/gis-schema.yml`: passed without schema warnings after explicit output serializers were added.
- From `frontend`: `npm.cmd test`: **68 passed, 14 files**. Includes both household/map navigation directions, unmapped households, explicit save, rejected saves, read-only staff, exact Leaflet center/zoom, marker clicks/dragging, CSRF payload and pagination.
- From `frontend`: `npm.cmd run typecheck` and `npm.cmd run build`: passed. Vite reports a non-fatal bundle-size advisory.
- `.\scripts\python.cmd scripts/extract_payahan.py .local/gis-source/hdx-original.zip frontend/public/maps/payahan.geojson`: succeeded; code, administrative parent, original coordinates and closed polygon ring validated. The public asset is bundled by Vite.
- One OSM street tile and one NASA satellite tile requested for connectivity verification: both HTTP 200. No offline tile cache was created.

Windows sandbox restrictions initially prevented npm/esbuild and native-tool file
access; the same checks succeeded with the required execution access. An initial
coordinate test exposed NaN acceptance; finite-number validation fixed it and
the test now passes. A first Ruff check reported a long line, subsequently fixed
by formatting; the final check passes. An initial schema check emitted generic
response warnings, subsequently resolved with explicit response serializers.

No browser-driven Playwright suite was run (this checkout has no `test:e2e`
script). Navigation and Leaflet interactions were verified with Testing Library
and Vitest. No live GIS migration, real household coordinate capture, PostGIS
round trip, licensed high-resolution satellite access or WAN-disconnected tile
coverage test was performed. Those require the native GIS runtime, appropriate
permissions, and locally provisioned licensed assets. No existing records,
environment files or health-module edits were changed by GIS provisioning.
