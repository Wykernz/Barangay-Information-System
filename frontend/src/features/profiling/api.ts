/** Proposed backend adapter. Not enabled by the current session-memory screens.
 * Keep all HTTP calls on the shared client so sessions and CSRF remain consistent.
 */
import axios from "axios";
import { api } from "../../api";

export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
export type Versioned = {
  id: string;
  reference: string;
  version: number;
  archived: boolean;
};
export type ResidentInput = {
  first_name: string;
  surname: string;
  birthdate: string;
  sex: string;
  civil_status: string;
};
export type Resident = Versioned & ResidentInput;
export type HouseholdInput = { name: string; purok: string; status: string };
export type Household = Versioned &
  HouseholdInput & {
    member_count: number;
    head_resident_id: string | null;
    housing_unit_id: string | null;
  };
export type HousingInput = {
  name: string;
  material: string;
  water_source: string;
  sanitation: string;
};
export type HousingUnit = Versioned &
  HousingInput & { location_status: string };
export type Membership = {
  id: string;
  resident_id: string;
  household_id: string;
  relationship: string;
  is_head: boolean;
  start_date: string;
  end_date: string | null;
  version: number;
};
export type EffectiveChange = {
  effective_date: string;
  reason: string;
  expected_version: number;
};
export type TransferInput = EffectiveChange & {
  destination_household_id: string;
  relationship: string;
};
export type TransferResult = {
  ended_membership: Membership;
  created_membership: Membership;
  household_versions: Record<string, number>;
};
export type DuplicateCandidate = {
  resident_id: string;
  reference: string;
  display_name: string;
  reasons: string[];
};
export type Occupancy = {
  id: string;
  household_id: string;
  housing_unit_id: string;
  start_date: string;
  end_date: string | null;
};
export type Query = { search?: string; page?: number; archived?: boolean };

/** Preserve transport failures; callers must never turn a rejected save into success. */
export class ProfilingRequestError extends Error {
  constructor(
    public readonly status: number | undefined,
    public readonly fields: Record<string, string[]>,
    message: string,
  ) {
    super(message);
    this.name = "ProfilingRequestError";
  }
}
function failure(error: unknown): ProfilingRequestError {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const body: unknown = axios.isAxiosError(error)
    ? error.response?.data
    : undefined;
  const fields: Record<string, string[]> = {};
  if (body && typeof body === "object" && !Array.isArray(body)) {
    for (const [key, value] of Object.entries(body)) {
      if (
        Array.isArray(value) &&
        value.every((item) => typeof item === "string")
      )
        fields[key] = value;
    }
  }
  const messages: Record<number, string> = {
    400: "Review the highlighted fields.",
    401: "Your session has expired. Sign in again.",
    403: "You do not have permission for this action.",
    404: "This record is unavailable.",
    409: "This record changed. Reload it before trying again.",
    429: "Too many requests. Try again later.",
  };
  return new ProfilingRequestError(
    status,
    fields,
    status
      ? (messages[status] ?? "The server could not complete the request.")
      : "Cannot reach the server. No change was confirmed.",
  );
}
async function request<T>(
  method: "get" | "post" | "patch",
  url: string,
  data?: unknown,
  params?: Query,
): Promise<T> {
  try {
    // Acquire a fresh CSRF cookie before mutations, including after session rotation.
    if (method !== "get") await api.get("auth/csrf/");
    return (await api.request<T>({ method, url, data, params })).data;
  } catch (error) {
    throw failure(error);
  }
}
const path = (id: string) => encodeURIComponent(id);
function resource<T, Input>(root: string) {
  return {
    list: (query: Query = {}) =>
      request<Page<T>>("get", `${root}/`, undefined, query),
    get: (id: string) => request<T>("get", `${root}/${path(id)}/`),
    create: (input: Input) => request<T>("post", `${root}/`, input),
    update: (
      id: string,
      input: Partial<Input> & { expected_version: number },
    ) => request<T>("patch", `${root}/${path(id)}/`, input),
    // Archive/restore is proposed PATCH semantics, never hard deletion.
    archive: (id: string, archived: boolean, expected_version: number) =>
      request<T>("patch", `${root}/${path(id)}/`, {
        archived,
        expected_version,
      }),
  };
}
export const profilingApi = {
  residents: resource<Resident, ResidentInput>("residents"),
  households: resource<Household, HouseholdInput>("households"),
  housingUnits: resource<HousingUnit, HousingInput>("housing-units"),
  memberships: (residentId: string) =>
    request<Page<Membership>>(
      "get",
      `residents/${path(residentId)}/memberships/`,
    ),
  members: (householdId: string) =>
    request<Page<Membership>>(
      "get",
      `households/${path(householdId)}/memberships/`,
    ),
  assign: (
    householdId: string,
    input: EffectiveChange & { resident_id: string; relationship: string },
  ) =>
    request<Membership>(
      "post",
      `households/${path(householdId)}/memberships/`,
      input,
    ),
  transfer: (membershipId: string, input: TransferInput) =>
    request<TransferResult>(
      "post",
      `memberships/${path(membershipId)}/transfer/`,
      input,
    ),
  unassign: (membershipId: string, input: EffectiveChange) =>
    request<Membership>(
      "post",
      `memberships/${path(membershipId)}/end/`,
      input,
    ),
  selectHead: (
    householdId: string,
    input: EffectiveChange & { resident_id: string },
  ) =>
    request<Page<Membership>>(
      "post",
      `households/${path(householdId)}/head-assignments/`,
      input,
    ),
  occupancies: (householdId: string) =>
    request<Page<Occupancy>>(
      "get",
      `households/${path(householdId)}/occupancies/`,
    ),
  move: (
    householdId: string,
    input: EffectiveChange & { housing_unit_id: string },
  ) =>
    request<{
      ended_occupancy: Occupancy | null;
      created_occupancy: Occupancy;
    }>("post", `households/${path(householdId)}/occupancies/`, input),
  duplicates: (input: ResidentInput) =>
    request<{ candidates: DuplicateCandidate[] }>(
      "post",
      "residents/duplicate-check/",
      input,
    ),
};
