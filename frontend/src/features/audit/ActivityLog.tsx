import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";
import { loadAuditEvents, type AuditFilters } from "./api";

const localTime = (value: string) =>
  new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  });

export default function ActivityLog() {
  const [draft, setDraft] = useState<AuditFilters>({});
  const [filters, setFilters] = useState<AuditFilters>({ page: 1 });
  const [filterError, setFilterError] = useState("");
  const query = useQuery({
    queryKey: ["audit-events", filters],
    queryFn: () => loadAuditEvents(filters),
    retry: false,
  });
  const data = query.data;
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.date_from && draft.date_to && draft.date_from > draft.date_to) {
      setFilterError("The start date must be on or before the end date.");
      return;
    }
    setFilterError("");
    setFilters({
      search: draft.search?.trim() || undefined,
      action: draft.action?.trim() || undefined,
      staff: draft.staff?.trim() || undefined,
      date_from: draft.date_from || undefined,
      date_to: draft.date_to || undefined,
      page: 1,
    });
  }
  return (
    <section className="activity-log">
      <header className="housing-page-heading">
        <div>
          <p className="eyebrow">MANAGEMENT / ACCOUNTABILITY</p>
          <h1>Activity log</h1>
          <p>Authorized registry activity recorded by the server.</p>
        </div>
        <button
          className="secondary"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>
      <form className="panel audit-filter-bar" onSubmit={apply}>
        <label>
          Search records
          <span className="audit-search-control">
            <Search size={16} aria-hidden="true" />
            <input
              value={draft.search ?? ""}
              onChange={(event) =>
                setDraft((value) => ({ ...value, search: event.target.value }))
              }
              placeholder="Action, record type, or record ID"
            />
          </span>
        </label>
        <label>
          Action type
          <input
            value={draft.action ?? ""}
            onChange={(event) =>
              setDraft((value) => ({ ...value, action: event.target.value }))
            }
            placeholder="e.g. households.household.create"
          />
        </label>
        <label>
          Staff username
          <input
            value={draft.staff ?? ""}
            onChange={(event) =>
              setDraft((value) => ({ ...value, staff: event.target.value }))
            }
            placeholder="Filter by staff"
          />
        </label>
        <label>
          From
          <input
            type="date"
            value={draft.date_from ?? ""}
            onChange={(event) =>
              setDraft((value) => ({ ...value, date_from: event.target.value }))
            }
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={draft.date_to ?? ""}
            onChange={(event) =>
              setDraft((value) => ({ ...value, date_to: event.target.value }))
            }
          />
        </label>
        <button type="submit">Apply filters</button>
      </form>
      {filterError && (
        <p role="alert" className="notice">
          {filterError}
        </p>
      )}
      {query.isPending && <p role="status">Loading activity…</p>}
      {query.isError && (
        <div className="panel" role="alert">
          <h2>Audit feed unavailable</h2>
          <p>
            This account may not have audit-view permission, or the server could
            not be reached. Activity history is not replaced with session data.
          </p>
          <button onClick={() => query.refetch()}>Retry</button>
        </div>
      )}
      {data && (
        <section className="panel audit-table-panel">
          <div className="audit-table-heading">
            <h2>Recorded events</h2>
            <span>{data.count.toLocaleString("en-PH")} records</span>
          </div>
          {!data.results.length ? (
            <div className="housing-empty">
              <strong>No matching audit events</strong>
              <span>
                Try a different date, action, staff username, or record search.
              </span>
            </div>
          ) : (
            <div className="housing-table-scroll">
              <table>
                <caption className="sr-only">
                  Authorized database activity log
                </caption>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Staff</th>
                    <th>Record reference</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((event) => (
                    <tr key={event.id}>
                      <td>{localTime(event.occurred_at)}</td>
                      <td>{event.action}</td>
                      <td>{event.actor_username ?? "System"}</td>
                      <td>
                        <span>{event.target_type}</span>
                        <small>{event.target_id}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(filters.page ?? 1) > 1 || data.next ? (
            <nav className="housing-pagination" aria-label="Activity pages">
              <button
                className="secondary"
                disabled={(filters.page ?? 1) <= 1 || query.isFetching}
                onClick={() =>
                  setFilters((value) => ({
                    ...value,
                    page: Math.max(1, (value.page ?? 1) - 1),
                  }))
                }
              >
                Previous
              </button>
              <span>
                Page {filters.page ?? 1} · {data.count} total
              </span>
              <button
                className="secondary"
                disabled={!data.next || query.isFetching}
                onClick={() =>
                  setFilters((value) => ({
                    ...value,
                    page: (value.page ?? 1) + 1,
                  }))
                }
              >
                Next
              </button>
            </nav>
          ) : null}
        </section>
      )}
      <p className="audit-data-note">
        Audit details show action and record identifiers only; the private event
        metadata payload is not exposed in this view.
      </p>
    </section>
  );
}
