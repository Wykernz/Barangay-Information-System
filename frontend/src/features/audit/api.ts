import { api } from "../../api";

export type AuditEvent = {
  id: string;
  occurred_at: string;
  actor: number | null;
  actor_username: string | null;
  action: string;
  target_type: string;
  target_id: string;
};
export type AuditPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditEvent[];
};
export type AuditFilters = {
  search?: string;
  action?: string;
  staff?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
};

export async function loadAuditEvents(filters: AuditFilters = {}) {
  return (await api.get<AuditPage>("audit/events/", { params: filters })).data;
}
