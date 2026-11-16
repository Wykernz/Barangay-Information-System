import axios from "axios";
import { api } from "../api";

export const FORM_MODULES = [
  "residents",
  "households",
  "housing",
  "surveys",
  "gis",
] as const;

export const FIELD_TYPES = [
  "text",
  "long_text",
  "integer",
  "decimal",
  "boolean",
  "date",
  "choice",
  "multi_choice",
] as const;

export type FormModule = (typeof FORM_MODULES)[number];
export type FieldType = (typeof FIELD_TYPES)[number];
export type FormStatus = "draft" | "active" | "archived";

export type FormField = {
  id?: number;
  key: string;
  label: string;
  help_text: string;
  data_type: FieldType;
  required: boolean;
  position: number;
  options: string[];
  sensitive: boolean;
};

export type FormDefinition = {
  id: string;
  module: FormModule;
  name: string;
  version: number;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  fields: FormField[];
};

export type FormDefinitionPayload = Pick<
  FormDefinition,
  "module" | "name" | "version"
> & {
  status: "draft";
  fields: FormField[];
};

export type PaginatedForms = {
  count: number;
  next: string | null;
  previous: string | null;
  results: FormDefinition[];
};

export async function listProfileForms(
  url = "profile-forms/",
): Promise<PaginatedForms> {
  return (await api.get<PaginatedForms>(url)).data;
}

export async function getProfileForm(id: string): Promise<FormDefinition> {
  return (await api.get<FormDefinition>(`profile-forms/${id}/`)).data;
}

export async function createProfileForm(
  payload: FormDefinitionPayload,
): Promise<FormDefinition> {
  return (await api.post<FormDefinition>("profile-forms/", payload)).data;
}

export async function updateProfileForm(
  id: string,
  payload: FormDefinitionPayload,
): Promise<FormDefinition> {
  return (await api.patch<FormDefinition>(`profile-forms/${id}/`, payload))
    .data;
}

export async function transitionProfileForm(
  id: string,
  action: "activate" | "archive",
): Promise<FormDefinition> {
  return (await api.post<FormDefinition>(`profile-forms/${id}/${action}/`))
    .data;
}

function responseDetail(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  const data: unknown = error.response?.data;
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof data.detail === "string"
  ) {
    return data.detail;
  }
  return null;
}

export function profileFormError(
  error: unknown,
  action: "load" | "save",
): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const detail = responseDetail(error);
  const preserved =
    action === "save" ? " Your edits are still here; nothing was saved." : "";

  if (status === 401 || status === 403) {
    return `Your staff account does not have permission to ${action === "save" ? "change" : "view"} field definitions.${preserved}`;
  }
  if (!status || status >= 500) {
    return `The field planner service is unavailable. Check the backend connection and try again.${preserved}`;
  }
  if (status === 404) {
    return `The profile-form API or requested definition could not be found. Confirm that the backend endpoint is ready.${preserved}`;
  }
  if (status === 400 || status === 409 || status === 422) {
    return `The backend rejected this definition${detail ? `: ${detail}` : ". Check the fields and try again."}${preserved}`;
  }
  return `The field planner could not ${action === "save" ? "save this definition" : "load field definitions"}.${preserved}`;
}
