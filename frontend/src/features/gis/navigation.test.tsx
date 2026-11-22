// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  DatabaseHouseholdDetail,
  DatabaseHouseholdDirectory,
} from "./HouseholdLocation";
import MapPage from "../../pages/MapPage";
import { gisApi, type MapConfiguration, type MapHousehold } from "./api";

vi.mock("./api", async (original) => ({
  ...(await original<typeof import("./api")>()),
  gisApi: {
    config: vi.fn(),
    households: vi.fn(),
    householdPage: vi.fn(),
    household: vi.fn(),
    save: vi.fn(),
  },
}));
vi.mock("./GeographicMap", () => ({
  default: (props: {
    selected?: MapHousehold;
    editing: boolean;
    onTileError: () => void;
    onSelect: (id: string) => void;
    onPosition: (point: { latitude: number; longitude: number }) => void;
  }) => (
    <div aria-label="Test map">
      <p>Focused location: {props.selected?.location?.id ?? "none"}</p>
      <button onClick={props.onTileError}>Simulate provider failure</button>
      <button onClick={() => props.onSelect("test-household")}>
        Click house marker
      </button>
      {props.editing && (
        <button
          onClick={() => props.onPosition({ latitude: 1.5, longitude: 2.5 })}
        >
          Choose point or drag marker
        </button>
      )}
    </div>
  ),
}));

const household: MapHousehold = {
  id: "test-household",
  reference: "HH-SYNTHETIC",
  label: "Synthetic household",
  is_active: true,
  housing_unit: "test-unit",
  housing_label: "Synthetic house",
  occupancy_conflict: false,
  location: {
    id: "point-1",
    latitude: 1,
    longitude: 2,
    source: "Synthetic test",
    accuracy_m: null,
    verification_status: "unverified",
  },
};
const config: MapConfiguration = {
  center: [12.0715, 124.5922],
  zoom: 18,
  gis_enabled: true,
  can_edit: true,
  boundary_url: "/maps/payahan.geojson",
  providers: [
    {
      id: "street",
      label: "Street map",
      url: "/tiles/{z}/{x}/{y}.png",
      attribution: "Test",
      licence: "https://example.test",
      offline: true,
      max_native_zoom: 18,
      note: "",
    },
  ],
};
beforeEach(() => {
  vi.mocked(gisApi.config).mockResolvedValue(config);
  vi.mocked(gisApi.households).mockResolvedValue([household]);
  vi.mocked(gisApi.householdPage).mockResolvedValue({
    count: 1,
    results: [household],
    next: null,
    previous: null,
  });
  vi.mocked(gisApi.household).mockResolvedValue(household);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "FeatureCollection",
        features: [],
        metadata: { status: "indicative", source_date: "test" },
      }),
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
function page(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/households/:id" element={<DatabaseHouseholdDetail />} />
        <Route path="/households" element={<DatabaseHouseholdDirectory />} />
        <Route path="/gis" element={<MapPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

test("household View on Map focuses its exact saved location; marker returns to household", async () => {
  page("/households/test-household");
  fireEvent.click(await screen.findByRole("link", { name: "View on map" }));
  expect(await screen.findByText("Focused location: point-1")).toBeTruthy();
  expect(
    new URL(
      (screen.getByRole("link", { name: "Directions" }) as HTMLAnchorElement)
        .href,
    ).searchParams.get("destination"),
  ).toBe("1,2");
  fireEvent.click(screen.getByRole("button", { name: "Click house marker" }));
  fireEvent.click(screen.getByRole("link", { name: "View household details" }));
  expect(
    await screen.findByRole("heading", { name: "Synthetic household" }),
  ).toBeTruthy();
  expect(screen.getByText("1.000000, 2.000000")).toBeTruthy();
  expect(
    new URL(
      (screen.getByRole("link", { name: "Directions" }) as HTMLAnchorElement)
        .href,
    ).searchParams.get("destination"),
  ).toBe("1,2");
});

test("database household registry searches, filters, and paginates returned database rows", async () => {
  const second = {
    ...household,
    id: "second-household",
    reference: "HH-SECOND",
    label: "Second synthetic household",
    is_active: false,
    housing_unit: "unit-2",
    location: null,
  };
  vi.mocked(gisApi.householdPage)
    .mockResolvedValueOnce({
      count: 2,
      results: [household],
      next: "/api/v1/gis/households/?page=2",
      previous: null,
    })
    .mockResolvedValueOnce({
      count: 2,
      results: [second],
      next: null,
      previous: "/api/v1/gis/households/?page=1",
    });
  page("/households");
  expect(await screen.findByText("HH-SYNTHETIC")).toBeTruthy();
  expect(screen.getByText("Total households")).toBeTruthy();
  expect(screen.getByText("Active households")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Search households"), {
    target: { value: "HH-SYNTHETIC" },
  });
  expect(screen.getByText("HH-SYNTHETIC")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Housing location"), {
    target: { value: "unmapped" },
  });
  expect(screen.getByText("No households match these filters.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Housing location"), {
    target: { value: "all" },
  });
  fireEvent.change(screen.getByLabelText("Search households"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(await screen.findByText("HH-SECOND")).toBeTruthy();
  expect(gisApi.householdPage).toHaveBeenLastCalledWith(2);
});

test("unmapped household has no fabricated point; selection only saves after confirmation", async () => {
  vi.mocked(gisApi.households).mockResolvedValue([
    { ...household, location: null },
  ]);
  vi.mocked(gisApi.save).mockResolvedValue(household);
  page("/gis?household=test-household");
  expect(await screen.findByText("Focused location: none")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Set house location" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Choose point or drag marker" }),
  );
  expect(gisApi.save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Location source"), {
    target: { value: "Synthetic source" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save location" }));
  await waitFor(() =>
    expect(gisApi.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: household.id, location: null }),
      { latitude: 1.5, longitude: 2.5 },
      "Synthetic source",
      "",
    ),
  );
  expect(
    await screen.findByText(/House location saved to the database/),
  ).toBeTruthy();
});

test("denied save never displays successful persistence", async () => {
  vi.mocked(gisApi.save).mockRejectedValue(Error("Forbidden"));
  page("/gis?household=test-household");
  fireEvent.click(
    await screen.findByRole("button", { name: "Set house location" }),
  );
  fireEvent.change(screen.getByLabelText("Location source"), {
    target: { value: "Synthetic source" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save location" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("not saved"),
  );
  expect(screen.queryByText(/House location saved to the database/)).toBeNull();
});

test("read-only staff cannot enter location capture", async () => {
  vi.mocked(gisApi.config).mockResolvedValue({ ...config, can_edit: false });
  page("/gis?household=test-household");
  await screen.findByText("Focused location: point-1");
  expect(
    screen.queryByRole("button", { name: "Set house location" }),
  ).toBeNull();
});

test("failed hybrid credentials offer explicit recovery to the street map", async () => {
  vi.mocked(gisApi.config).mockResolvedValue({
    ...config,
    default_provider: "hybrid",
    providers: [
      ...config.providers,
      {
        ...config.providers[0],
        id: "hybrid",
        label: "Hybrid",
        engine: "esri",
        available: true,
        access_token: "synthetic-test-only",
        url: null,
      },
    ],
  });
  page("/gis");
  fireEvent.click(
    await screen.findByRole("button", { name: "Simulate provider failure" }),
  );
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("Hybrid could not load"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Use Street map" }));
  expect((screen.getByLabelText("Map layer") as HTMLSelectElement).value).toBe(
    "street",
  );
  expect(screen.queryByText(/Hybrid could not load/)).toBeNull();
});

test("admin sees why assignment is disabled when server location storage is missing", async () => {
  vi.mocked(gisApi.config).mockResolvedValue({
    ...config,
    gis_enabled: false,
    can_edit: false,
    can_number_houses: true,
  });
  page("/gis?household=test-household");
  const button = await screen.findByRole("button", {
    name: "Set house location",
  });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(
    screen.getByText(
      /After that, the admin can place and save house pins here without changing code/,
    ),
  ).toBeTruthy();
});

test("hybrid without a provider key is disabled while the street map stays usable", async () => {
  vi.mocked(gisApi.config).mockResolvedValue({
    ...config,
    providers: [
      ...config.providers,
      {
        ...config.providers[0],
        id: "hybrid",
        label: "Hybrid",
        url: null,
        engine: "esri",
        available: false,
      },
    ],
  });
  page("/gis");
  expect(
    (
      (await screen.findByRole("option", {
        name: "Hybrid — setup required",
      })) as HTMLOptionElement
    ).disabled,
  ).toBe(true);
  expect(screen.getByLabelText("Test map")).toBeTruthy();
});

test("outdated backend shows recovery instructions and retry loads the map", async () => {
  vi.mocked(gisApi.config).mockRejectedValueOnce({
    isAxiosError: true,
    response: { status: 404 },
  });
  page("/gis");
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("Restart the backend"),
  );
  expect(screen.queryByText("Loading map configuration…")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry map" }));
  expect(await screen.findByLabelText("Test map")).toBeTruthy();
});

test("map directory searches housing details and filters occupancy without inventing puroks", async () => {
  vi.mocked(gisApi.households).mockResolvedValue([
    household,
    {
      ...household,
      id: "other-household",
      reference: "HH-SECOND",
      label: "Second synthetic household",
      is_active: false,
      housing_unit: "other-unit",
      housing_label: "Other house",
      location: null,
    },
  ]);
  page("/gis");
  expect(await screen.findByText("Linked housing units")).toBeTruthy();
  fireEvent.change(
    screen.getByLabelText("Find household, housing unit, or location"),
    { target: { value: "test-unit" } },
  );
  expect(
    screen.getByRole("button", { name: "Synthetic household" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Second synthetic household" }),
  ).toBeNull();
  fireEvent.change(
    screen.getByLabelText("Find household, housing unit, or location"),
    { target: { value: "" } },
  );
  fireEvent.change(screen.getByLabelText("Household status"), {
    target: { value: "inactive" },
  });
  expect(
    screen.getByRole("button", { name: "Second synthetic household" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Synthetic household" }),
  ).toBeNull();
  expect(screen.getByText(/Purok filtering will be available/)).toBeTruthy();
});
