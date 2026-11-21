import { api } from "../../api";

export type Position = { latitude: number; longitude: number };
export type HouseholdLocation = Position & {
  id: string;
  source: string;
  accuracy_m: string | null;
  verification_status: string;
};
export type MapHousehold = {
  id: string;
  reference: string;
  label: string;
  is_active: boolean;
  housing_unit: string | null;
  housing_label: string | null;
  house_number?: string;
  occupancy_conflict: boolean;
  location: HouseholdLocation | null;
};
export type Provider = {
  engine?: "esri";
  available?: boolean;
  access_token?: string;
  style?: string;
  id: string;
  label: string;
  url: string | null;
  attribution: string;
  licence: string;
  offline: boolean;
  max_native_zoom: number;
  note: string;
};
export type MapConfiguration = {
  default_provider?: string;
  center: [number, number];
  zoom: number;
  gis_enabled: boolean;
  can_edit: boolean;
  can_number_houses?: boolean;
  providers: Provider[];
  boundary_url: string;
};
export const householdMapUrl = (id: string) =>
  `/gis?household=${encodeURIComponent(id)}`;
export const householdUrl = (id: string) =>
  `/households/${encodeURIComponent(id)}`;
export const gisApi = {
  numberHouse: async (unitId: string, houseNumber: string) => {
    await api.get("auth/csrf/");
    return (
      await api.patch<{ house_number: string }>(
        `housing-units/${encodeURIComponent(unitId)}/`,
        {
          house_number: houseNumber,
        },
      )
    ).data;
  },
  config: async () => (await api.get<MapConfiguration>("gis/config/")).data,
  households: async () => {
    const result: MapHousehold[] = [];
    let page = 1;
    while (true) {
      const response = await api.get<{
        results: MapHousehold[];
        next: string | null;
      }>("gis/households/", { params: { page } });
      result.push(...response.data.results);
      if (!response.data.next) return result;
      page++;
    }
  },
  household: async (id: string) =>
    (await api.get<MapHousehold>(`gis/households/${encodeURIComponent(id)}/`))
      .data,
  save: async (
    household: MapHousehold,
    position: Position,
    source: string,
    accuracy: string,
  ) => {
    await api.get("auth/csrf/");
    return (
      await api.post<MapHousehold>(
        `gis/households/${encodeURIComponent(household.id)}/location/`,
        {
          ...position,
          source,
          accuracy_m: accuracy || null,
          expected_location: household.location?.id ?? null,
          expected_housing_unit: household.housing_unit,
        },
      )
    ).data;
  },
};
