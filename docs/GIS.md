# Payahan household map

Publication handoff (2026-11-20): user authorized committing this increment and
pushing to the verified fork `adrianjoseph840-ship-it/Barangay-Information-System`,
branch `feature/adrian-setup`. Final frontend suite: 101 passed in 19 files;
production build/type checks passed (existing bundle advisory remains); audit:
zero vulnerabilities. Relevant backend suite: 31 passed, 2 native GIS tests
skipped; Ruff, Django check and OpenAPI validation passed. These checks used
the current worktree; unrelated health work is excluded from the commit.
Earlier statements that follow-up changes remain uncommitted describe their
review stage and are superseded by this explicit publication request. Native
PostGIS setup, `property_type` schema drift, official boundary sign-off and
actual flood/fire source datasets remain outstanding. No credentials or local
environment/diagnostic files are included in this publication.

Deployment update 2026-11-20: the target is online use by authorized staff only.
Licensed online basemaps and Google Maps directions are allowed; offline/local
tile instructions below are optional. This is not a resident portal or a claim
that the localhost development server is production-ready.

The user authorized this increment on 2026-11-20. Initial view is latitude
12.0715, longitude 124.5922, zoom 18, exactly as supplied. This is a view setting,
not evidence of a house location or an official boundary.

## Records and navigation

### Directions to a house

Select a house marker (or open its database household details), then choose
**Directions**. This opens Google Maps in a new tab/app with the saved house
latitude/longitude as the destination. Google Maps lets the user choose their
starting point and travel mode. The app makes no Google request on page load,
requests no device location and sends no household/resident names or IDs.
The staff click explicitly opens an external service with the destination point.
No API key is needed for this [Google Maps URL](https://developers.google.com/maps/documentation/urls/get-started).

Unmapped, invalid and rejected locations disable Directions. Unverified points
retain a visible warning. Unsaved dragged points are not used for directions;
the saved location remains the destination until a save succeeds. Online Google
directions require internet; LAN profiling/maps remain independently available.
Routes are not checked against local flood/fire layers and must not be presented
as evacuation or hazard-safe routing. No turn-by-turn route is calculated inside
the BIMS map by this increment. Changes remain uncommitted for review.

Directions validation: `npm.cmd test -- src/features/gis` passed **35 tests in
7 files**; the final destination assertions for both entry points passed with
`npm.cmd test -- src/features/gis/navigation.test.tsx src/features/gis/Directions.test.tsx`
(12 tests). `npm.cmd run build` passed, including TypeScript, with the existing
bundle-size advisory. No Google routing request or real journey was performed;
tests check the documented destination URL, disabled states and both UI links.

### Assign a house number and map pin

Admin assignment is an application workflow, not a per-house developer task.
The admin selects a database household, places/drags a pin and explicitly saves.
The server must first have a working PostGIS/GeoDjango runtime and the account
must have the location permissions. If storage is disabled, house administrators
now see a disabled **Set house location** control with the setup reason instead
of that action silently disappearing. This does not claim that setup is complete.
Hybrid is a separate provider feature: its disabled option means no ArcGIS
credential is configured, and it is not required to assign a pin on Street.

Open **Households → Database household locations → View on Map** and select the
household. Staff with `households.change_housingunit` can choose **Assign house
number**, enter its existing number (for example `12-A`) and choose **Save house
number**. Blank means **Not numbered**. Numbering is optional text, maximum 50
characters, on the housing unit; it is shared by all current households in that
house. It is not an automatically issued official address and no uniqueness or
numbering scheme is inferred. Numbers appear as permanent map-marker labels.
Household details also provide the same number editor. Changes use the existing
authenticated/CSRF-protected housing-unit PATCH API and its server permissions.
For the existing sample workflow, use **Housing units → select unit → Edit
details → House number → Save profile**. Its linked sample households show that
number too, but those sample edits remain in session memory and do not create
database houses or map pins. Do not confuse sample numbers with saved database
numbers. The two datasets are never silently matched by name or number.

To place a pin, select the database household, choose **Set house location**,
click its actual house, adjust the marker and explicitly save with a source.
This requires one current housing assignment, native PostGIS/GDAL/GEOS and
the location permissions below. The present workstation still has GIS storage
disabled; house-number editing does not enable location storage. Session-only
sample profiles do not become database records through either action.

Migration `households.0002_housingunit_house_number` adds only the optional
housing-unit column with a blank default and was applied to the local development
database on 2026-11-20. No unrelated health migration was applied.

`scripts/check_house_number.py` is a local DEBUG/PostgreSQL-only synthetic
round-trip check with unconditional transaction rollback. It found a pre-existing
required `property_type` database column absent from the repository model; no
synthetic rows remained and that column was not modified. The database check
is blocked until schema drift is reviewed. Unit/permission checks are separate
evidence, not a substitute for a successful database round trip.

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

If GIS shows no map and `/api/v1/gis/config/` returns 404, the development
backend is still running the earlier URL configuration. Stop that project's
Django terminal with Ctrl+C, then restart using the existing command in
`docs/RUNNING.md`. The embeddable Python launcher disables automatic reload;
frontend hot reload alone cannot load new backend endpoints. The map now shows
a specific recovery message and **Retry map** when configuration cannot load.
During the 2026-11-20 follow-up this was reproduced against the running backend:
the GIS configuration returned 404 while the static boundary returned 200.
Restarting the verified project server restored the endpoint (403 without a
session, as expected). The follow-up GIS suite passes 10 tests, including a
404/retry regression, and the frontend production build passes. These follow-up
changes are left uncommitted for user review.

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

### Esri hybrid imagery and labels

If Hybrid fails, the map offers **Use Street map** and explains key validity,
expiration, permissions and allowed website restrictions. During the latest
local diagnosis, the key was present in `backend/.env`, but the Esri labels
endpoint rejected it with HTTP 401 / ArcGIS error 498 (invalid/expired token).
No key value or raw provider response was printed. Replace the credential in
the local environment with an entitled browser key; no code change can reactivate
an invalid/expired credential. The existing credential was not overwritten.
Follow-up with the replacement credential isolated a referrer mismatch: the
labels metadata request succeeded with `http://localhost:5173/`, while the same
credential returned HTTP 401 / code 498 with `http://127.0.0.1:5173/`. Thus that
response did not mean the replacement key was globally invalid or expired.
Use the allowed localhost frontend address, or explicitly add the alternative
origin to the key's allowed website list in ArcGIS. Hostnames are not
interchangeable for credential restrictions. Sign in again after changing
frontend hostnames because the session cookie belongs to that hostname.
Verified an imagery tile and a matching labels tile at the user-supplied initial
map center with the localhost referrer: both returned HTTP 200 and image content.
Reloaded the project backend with the replacement key and confirmed the localhost
frontend returns 200. No credential was changed or printed, and no commit was made.
After adding explicit provider-failure recovery, `npm.cmd test -- src/features/gis`
passed 41 tests in 8 files and `npm.cmd run build` passed (existing bundle-size
advisory remains). Reloaded the verified backend to read the local key setting;
the API remains authenticated. The replacement credential and PostGIS runtime
remain external setup blockers. Follow-up changes are still uncommitted.

The **Hybrid · Esri imagery + labels** option combines authenticated World
Imagery with matching `arcgis/imagery/labels` raster tiles. It retains Leaflet,
uses the official `esri-leaflet` package, and lazy-loads the hybrid renderer only
when needed. No React-Leaflet rewrite or WebGL dependency is required. Imagery
credits are managed by Esri Leaflet; label credits are fetched from the source
metadata and rendered as escaped text. Label tiles use 512 px / zoomOffset -1
alignment and a non-interactive pane at z-index 300, below polygon overlays and
house markers. Switching layers removes the previous group and aborts pending
label metadata requests. Failed metadata/authentication does not create an
unattributed hybrid layer; the map shows an error and the street option remains
available. There is no automatic third-party fallback on provider failure.

Create an entitled **ArcGIS Location Platform** browser API key with the basemap
privileges required by the imagery and Static Basemap Tiles services. Restrict
the credential to the website's permitted referrer origins and appropriate
expiration. Put it only in ignored `backend/.env`, not in chat or source:

```text
GIS_ESRI_BROWSER_KEY=your-browser-scoped-arcgis-key
```

Restart Django and refresh the frontend. With a key configured, Hybrid is the
default; without one it is disabled with a setup notice and Street remains the
default. The authenticated map configuration necessarily exposes this limited
browser credential to staff; never use a secret/admin token. A configured value
does not prove its validity or paid entitlement. Do not use unauthenticated legacy
imagery URLs to bypass provider licensing. No key/account/subscription was created
by this task, and Payahan imagery clarity/date still requires visual review with
an entitled account. Reference: [Esri's imagery plus raster-label tutorial](https://developers.arcgis.com/esri-leaflet/maps/raster-tile-basemaps/display-multiple-basemap-layers/).

The final raster design avoids the critical MapLibre dependency identified in
the initially evaluated vector renderer. The vulnerable vector dependency was
removed rather than force-upgraded; `npm.cmd audit` reports zero vulnerabilities.
This basemap change does not resolve native GIS storage, hazard-source availability
or the existing `property_type` schema drift. No data migration is required.

Hybrid validation on 2026-11-20: `npm.cmd test -- src/features/gis` passed
39 tests in 8 files; `npm.cmd run typecheck` and `npm.cmd run build` passed
(separate lazy-loaded hybrid chunk; existing main-bundle size advisory remains).
`npm.cmd audit` reported zero vulnerabilities. Backend
`scripts/test_backend.py households/test_map.py --reuse-db -p no:cacheprovider`
passed 23 tests, and Ruff/OpenAPI validation passed. Checked credential presence
without printing its value: no browser key is configured. Reloaded the verified
development backend; no database or environment values were changed. Live Esri
tile access and Payahan imagery detail were not validated without credentials.
Layer composition, attribution escaping, failed authentication, disabled setup
state and hybrid-to-street cleanup were tested using synthetic mocks. No new
commit, push, account registration or subscription purchase was performed.

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

## Flood and fire risk layers (sources pending)

Use **Area risk layers → Risk overlay** to choose a flood or fire dataset.
Only one hazard overlay is shown at a time so overlapping colors do not obscure
which hazard is being assessed. Houses keep their selection colors; marker
colors are not risk ratings. The overlay legend uses the dataset's own category
labels and explicit colors, with visible source, date, licence and indicative
or locally reviewed status. Uncolored areas are **unassessed**, never assumed
safe. Flood susceptibility is not current measured water depth or a live alert.
Fire datasets must distinguish building/urban fire from wildfire in their title
and source description; the app does not infer either from building materials.

The default `frontend/public/maps/hazards/manifest.json` intentionally contains
no layers. No Payahan risk zones have been invented. Source-pending controls
are usable but show **No dataset loaded** and draw no colored polygons.

For public GIS data licensed for local redistribution, the operator places a
reviewed WGS84/EPSG:4326 Polygon/MultiPolygon FeatureCollection under
`frontend/public/maps/hazards/<dataset>.geojson` and registers it in the manifest.
Every feature must have `properties.risk_class` matching an original source
category mapped in the legend. Preserve original geometry, record any authorized
format/CRS conversion and original category mapping; do not draw zones from
memory. Obtain flood source data from the responsible GIS/hazard agency and
coordinate local review with CDRRMO; obtain appropriate local fire assessments
from the responsible fire/disaster office. Online visibility alone does not
establish permission to download or redistribute a layer.

Manifest entry structure (placeholders require replacement with actual metadata;
this is not a dataset or an assertion of local review):

```json
{
  "version": 1,
  "layers": [{
    "id": "source-flood-version",
    "kind": "flood",
    "label": "Exact source title and scenario",
    "url": "/maps/hazards/source-flood-version.geojson",
    "source": "Publishing organization",
    "source_url": "https://provider.example/dataset",
    "source_date": "YYYY-MM-DD",
    "licence_url": "https://provider.example/licence",
    "status": "indicative",
    "legend": [{
      "value": "ORIGINAL_SOURCE_CATEGORY",
      "label": "Exact category label from source",
      "color": "#D73027"
    }]
  }]
}
```

`kind` is `flood` or `fire`. `locally_reviewed` status additionally requires
`review_authority` naming the responsible reviewing office; it does not convert
the layer into an official barangay boundary. Multiple datasets/scenarios may
be registered with distinct IDs. There are no invented depth thresholds or
automatic risk classifications.

The loader accepts same-origin files in this directory only, with required
provenance/HTTPS source and licence URLs, an ISO source date, hex colors and
unique legend values. It validates closed finite-coordinate polygon rings,
rejects unknown categories, limits files to 10 MB and 10,000 features, and clears
the previous overlay on selection changes or failure. This checks import format,
not scientific validity or complete topology; GIS review remains necessary.
Loaded local files work without internet. Store only public licensed zone data
here: no resident details, house assessments, personal reviewer names or private
incident records. Such private records require a separate protected backend
workflow; a static-file upload is not provided for them.

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

House-number and hazard-layer follow-up (left uncommitted):

- `npm.cmd test` in `frontend`: **88 passed, 17 files**, including sample number
  capture, CSRF-protected housing-unit numbering, permanent marker labels,
  pending flood/fire sources, source/legend validation and overlay switching.
- `npm.cmd run build`: passed, including TypeScript; Vite retains its non-fatal
  bundle-size advisory.
- `.\scripts\python.cmd scripts/test_backend.py households/test_house_numbers.py households/test_map.py households/test_boundary.py households/tests.py gis/test_household_map.py --reuse-db -p no:cacheprovider`: **28 passed, 2 native GIS tests skipped**.
- Ruff on changed household models/serializers/map views/tests and
  `scripts/check_house_number.py`: passed after formatting. Django check,
  migration-file consistency and OpenAPI validation: passed.
- Reviewed `migrate households 0002 --plan` and `sqlmigrate households 0002`,
  then applied only that additive migration successfully. Restarted the verified
  local project backend; GIS endpoint requires authentication as expected, and
  the public risk manifest serves an empty layer list.
- `scripts/check_house_number.py`: **blocked** by the pre-existing required
  `property_type` column missing from the model. Initial synthetic insertion
  failed and rolled back; the script now refuses before inserting. No claim of
  successful live database numbering integration is made, and no schema repair
  or real-record update was attempted. Native pin storage is still disabled.
- Hazard geometry in tests is arbitrary synthetic data only; it is not bundled
  in the application or published as Payahan risk data. Licensed flood/fire
  sources and their review remain pending. No further commit or push was made.

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
