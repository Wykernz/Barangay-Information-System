import axios from "axios";
import { api } from "../../api";
import type { RecordRow } from "../../demo/catalog";

export const residentFields = {
  firstName: "given_name",
  middleName: "middle_name",
  surname: "family_name",
  suffix: "suffix",
  birthdate: "birth_date",
  sex: "sex",
  civilStatus: "civil_status",
  nationality: "nationality",
  placeOfBirth: "place_of_birth",
  contactNumber: "contact_number",
  email: "email",
  residencyClassification: "residency_classification",
  residencyStatus: "residency_status",
  recordStatus: "record_status",
  purok: "purok",
} as const;

type ResidentResponse = Record<string, unknown> & {
  id: string;
  reference: string;
};
function toRow(data: ResidentResponse): RecordRow {
  const row: RecordRow = {
    id: data.id,
    personId: data.reference,
    _storage: "database",
    registrationDate: String(data.created_at),
    photoUrl: String(data.photo_url ?? ""),
    archived: data.is_archived ? "true" : "false",
    status: data.verification_status === "verified" ? "Verified" : "Unverified",
  };
  for (const [key, field] of Object.entries(residentFields))
    row[key] = String(data[field] ?? "");
  row.name = [row.firstName, row.middleName, row.surname, row.suffix]
    .filter(Boolean)
    .join(" ");
  return row;
}

export async function loadResidents(signal: AbortSignal): Promise<RecordRow[]> {
  const rows: RecordRow[] = [];
  let page = 1;
  for (;;) {
    const { data } = await api.get<{
      results: ResidentResponse[];
      next: string | null;
    }>("residents/", { params: { page }, signal });
    rows.push(...data.results.map(toRow));
    if (!data.next) return rows;
    page++;
  }
}

export async function persistResident(
  row: RecordRow,
  photo?: File,
): Promise<RecordRow> {
  await api.get("auth/csrf/");
  const payload: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(residentFields)) {
    if (row[key] !== undefined)
      payload[field] = field === "birth_date" ? row[key] || null : row[key];
  }
  payload.is_archived = row.archived === "true";
  // IDs, verification, timestamps and custom extension values are never overwritten here.
  let body: Record<string, unknown> | FormData = payload;
  if (photo) {
    const form = new FormData();
    for (const [key, value] of Object.entries(payload))
      form.append(key, value === null ? "" : String(value));
    form.append("photo", photo);
    body = form;
  }
  const response =
    row._storage === "database"
      ? await api.patch<ResidentResponse>(`residents/${row.id}/`, body)
      : await api.post<ResidentResponse>("residents/", body);
  return toRow(response.data);
}

export function residentError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404)
    return "The resident API route is missing from the backend serving this page. Restart Django from the current project checkout or deploy the matching backend version. No resident was saved.";
  if (axios.isAxiosError(error) && error.response?.status === 401)
    return "Your staff session expired. Sign in again, then retry saving the resident.";
  if (axios.isAxiosError(error) && error.response?.status === 403)
    return "Your account is not permitted to add or edit resident records. Ask an administrator to assign the Barangay Administrator role.";
  if (axios.isAxiosError(error) && !error.response)
    return "The BIMS backend could not be reached. Start Django and check the frontend API proxy. No resident was saved.";
  if (
    axios.isAxiosError(error) &&
    error.response?.data &&
    typeof error.response.data === "object"
  ) {
    return Object.entries(error.response.data)
      .map(
        ([field, message]) =>
          `${field}: ${Array.isArray(message) ? message.join(" ") : String(message)}`,
      )
      .join(" ");
  }
  return "Resident could not be saved. Check your connection and try again.";
}
