// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import GeographicMap from "./GeographicMap";
import type { MapConfiguration, MapHousehold } from "./api";

const state = vi.hoisted(() => ({
  view: vi.fn(),
  events: {} as Record<string, (event: unknown) => void>,
  markers: [] as {
    events: Record<string, () => void>;
    position: number[];
    draggable: boolean;
  }[],
  tiles: vi.fn(),
  tooltips: vi.fn(),
  hybrid: vi.fn(),
  hybridAdd: vi.fn(),
  hybridRemove: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("./EsriHybrid", () => ({ createHybridLayer: state.hybrid }));
vi.mock("leaflet", () => {
  const layer = () => ({
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    on: vi.fn(),
  });
  const map = {
    setView: state.view,
    on: (name: string, callback: (event: unknown) => void) => {
      state.events[name] = callback;
    },
    invalidateSize: vi.fn(),
    remove: state.remove,
  };
  state.view.mockReturnValue(map);
  return {
    default: {
      map: () => map,
      divIcon: vi.fn(),
      layerGroup: layer,
      geoJSON: layer,
      tileLayer: (...args: unknown[]) => {
        state.tiles(...args);
        return layer();
      },
      marker: (position: number[], options: { draggable?: boolean }) => {
        const events: Record<string, () => void> = {};
        state.markers.push({
          events,
          position,
          draggable: !!options.draggable,
        });
        return {
          addTo: vi.fn().mockReturnThis(),
          bindTooltip: (...args: unknown[]) => {
            state.tooltips(...args);
          },
          on: (event: string, cb: () => void) => {
            events[event] = cb;
          },
          getLatLng: () => ({ lat: 3.5, lng: 4.5 }),
        };
      },
    },
  };
});
const config: MapConfiguration = {
  center: [12.0715, 124.5922],
  zoom: 18,
  gis_enabled: true,
  can_edit: true,
  boundary_url: "/maps/payahan.geojson",
  providers: [
    {
      id: "street",
      label: "Street",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      offline: false,
      attribution: "© OpenStreetMap contributors",
      licence: "https://operations.osmfoundation.org/policies/tiles/",
      max_native_zoom: 18,
      note: "",
    },
  ],
};
const household: MapHousehold = {
  id: "synthetic-household",
  reference: "HH-SAMPLE",
  label: "Synthetic household",
  housing_unit: "synthetic-house",
  housing_label: "Synthetic house",
  is_active: true,
  occupancy_conflict: false,
  location: {
    id: "revision-1",
    latitude: 1.5,
    longitude: 2.5,
    source: "Synthetic test",
    accuracy_m: null,
    verification_status: "unverified",
  },
};
beforeEach(() => {
  const hybrid = {
    addTo: state.hybridAdd,
    on: vi.fn(),
    remove: state.hybridRemove,
  };
  state.hybridAdd.mockReturnValue(hybrid);
  state.hybrid.mockResolvedValue(hybrid);
  state.markers.length = 0;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

test("switching from hybrid to street removes both hybrid imagery and labels", async () => {
  const props = {
    configuration: config,
    households: [],
    selected: undefined,
    draft: null,
    editing: false,
    boundary: null,
    onSelect: vi.fn(),
    onPosition: vi.fn(),
    onTileError: vi.fn(),
  };
  const view = render(
    <GeographicMap
      {...props}
      provider={{
        ...config.providers[0],
        engine: "esri",
        available: true,
        access_token: "synthetic-test-only",
        url: null,
      }}
    />,
  );
  await waitFor(() => expect(state.hybridAdd).toHaveBeenCalled());
  view.rerender(<GeographicMap {...props} provider={config.providers[0]} />);
  expect(state.hybridRemove).toHaveBeenCalledOnce();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("initial center and zoom, saved-point focus and marker selection use actual map API", () => {
  const select = vi.fn();
  render(
    <GeographicMap
      configuration={config}
      provider={config.providers[0]}
      households={[household]}
      selected={household}
      draft={null}
      editing={false}
      boundary={null}
      onSelect={select}
      onPosition={vi.fn()}
      onTileError={vi.fn()}
    />,
  );
  expect(state.view).toHaveBeenNthCalledWith(1, [12.0715, 124.5922], 18);
  expect(state.view).toHaveBeenLastCalledWith([1.5, 2.5], 18);
  expect(state.markers[0].position).toEqual([1.5, 2.5]);
  state.markers[0].events.click();
  expect(select).toHaveBeenCalledWith(household.id);
  expect(state.tiles.mock.calls[0][1].attribution).toContain(
    "https://www.openstreetmap.org/copyright",
  );
});

test("map clicking and marker dragging update a draft; readonly map clicks do nothing", () => {
  const position = vi.fn();
  const props = {
    configuration: config,
    provider: config.providers[0],
    households: [household],
    selected: household,
    draft: household.location,
    boundary: null,
    onSelect: vi.fn(),
    onPosition: position,
    onTileError: vi.fn(),
  };
  const view = render(<GeographicMap {...props} editing />);
  state.events.click({ latlng: { lat: 5, lng: 6 } });
  expect(position).toHaveBeenLastCalledWith({ latitude: 5, longitude: 6 });
  expect(state.markers[0].draggable).toBe(true);
  state.markers[0].events.dragend();
  expect(position).toHaveBeenLastCalledWith({ latitude: 3.5, longitude: 4.5 });
  position.mockClear();
  view.rerender(<GeographicMap {...props} editing={false} />);
  state.events.click({ latlng: { lat: 9, lng: 10 } });
  expect(position).not.toHaveBeenCalled();
});

test("assigned house number is a permanent plain-text marker label", () => {
  render(
    <GeographicMap
      configuration={config}
      provider={config.providers[0]}
      households={[{ ...household, house_number: "12-A" }]}
      selected={undefined}
      draft={null}
      editing={false}
      boundary={null}
      onSelect={vi.fn()}
      onPosition={vi.fn()}
      onTileError={vi.fn()}
    />,
  );
  expect((state.tooltips.mock.calls[0][0] as HTMLElement).textContent).toBe(
    "12-A",
  );
  expect(state.tooltips.mock.calls[0][1]).toMatchObject({ permanent: true });
});
