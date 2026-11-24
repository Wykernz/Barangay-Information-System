import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  HeartHandshake,
  House,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import "./dashboard.css";

type Overview = {
  as_of: string;
  registered_persons: number;
  verified_residents: number;
  active_households: number;
  housing_units: number;
  occupied_units: number;
  mapped_units: number | null;
  age_groups: Record<string, number>;
  household_sizes: Record<string, number>;
  water_sources: Record<string, number>;
  sanitation: Record<string, number>;
  data_quality: Record<string, number>;
  residency: Record<string, number>;
  sex: Record<string, number>;
};
type RecentAudit = {
  id: string;
  occurred_at: string;
  actor_username: string | null;
  action: string;
  target_type: string;
  target_id: string;
};
type AuditPage = { results: RecentAudit[] };

function overviewFailure(error: unknown): string {
  if (!axios.isAxiosError(error))
    return "The overview could not be loaded. Refresh the page or contact your system administrator.";
  if (!error.response)
    return "The BIMS API could not be reached. Check that the backend is running and your connection is available.";
  if (error.response.status === 401)
    return "Your staff session has expired. Sign in again to load the overview.";
  if (error.response.status === 403)
    return "This account does not have permission to view resident, household, and housing summaries. Sign in with a Barangay Administrator account or ask an administrator to review the account role.";
  if (error.response.status === 404)
    return "This Django server does not have the overview API route. Restart it from the current Barangay-Information-System checkout; if this is a hosted deployment, deploy the matching backend version.";
  if (error.response.status >= 500)
    return `The BIMS server returned an error while loading the overview (HTTP ${error.response.status}). Ask the system administrator to check the backend logs.`;
  return `The overview request failed (HTTP ${error.response.status}). Refresh the page or contact your system administrator.`;
}

function Distribution({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  return (
    <section className="overview-panel" aria-label={title}>
      <h2>{title}</h2>
      <div className="overview-bars">
        {Object.entries(values).map(([label, count]) => (
          <div className="overview-bar" key={label}>
            <div>
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
            <div className="overview-track" aria-hidden="true">
              <span
                style={{ width: `${total ? (count / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const query = useQuery({
    queryKey: ["staff-overview"],
    queryFn: async () => (await api.get<Overview>("overview/")).data,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const activity = useQuery({
    queryKey: ["recent-audit-events"],
    queryFn: async () =>
      (await api.get<AuditPage>("audit/events/", { params: { page: 1 } })).data,
    retry: false,
  });
  const data = query.data;
  const stats = data
    ? [
        {
          label: "Registered persons",
          value: data.registered_persons,
          to: "/residents",
          icon: Users,
          note: "Active profiles",
        },
        {
          label: "Verified residents",
          value: data.verified_residents,
          to: "/residents",
          icon: ShieldCheck,
          note: "Verified resident classification",
        },
        {
          label: "Active households",
          value: data.active_households,
          to: "/households",
          icon: House,
          note: "Active household records",
        },
        {
          label: "Housing units",
          value: data.housing_units,
          to: "/housing",
          icon: Building2,
          note: "Active housing units",
        },
      ]
    : [];
  return (
    <div className="community-overview">
      <nav className="overview-breadcrumb" aria-label="Breadcrumb">
        <span>Workspace</span>
        <ArrowRight size={13} aria-hidden="true" />
        <span aria-current="page">Overview</span>
      </nav>
      <div className="overview-header">
        <div>
          <p className="eyebrow">BARANGAY PAYAHAN</p>
          <h1>Community Overview</h1>
          <p className="muted">
            Community demographics, household records, housing, and social
            assistance monitoring.
          </p>
          <p className="overview-date">
            {data
              ? `Reporting date: ${new Date(`${data.as_of}T00:00:00`).toLocaleDateString("en-PH", { dateStyle: "long" })}`
              : "Database summary"}
          </p>
        </div>
        <div className="overview-header-actions">
          <button
            className="secondary"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw size={16} aria-hidden="true" />{" "}
            {query.isFetching ? "Refreshing…" : "Refresh"}
          </button>
          <Link className="button-link" to="/residents">
            <UserPlus size={16} aria-hidden="true" /> Register resident
          </Link>
        </div>
      </div>
      {query.isPending && (
        <p className="overview-state" role="status">
          Loading database summary…
        </p>
      )}
      {query.isError && (
        <div className="overview-state" role="alert">
          <strong>Summary unavailable</strong>
          <p>{overviewFailure(query.error)}</p>
          <button onClick={() => query.refetch()}>Retry</button>
        </div>
      )}
      {data && (
        <>
          <section
            aria-label="Primary statistics"
            className="overview-stat-grid"
          >
            {stats.map(({ label, value, to, icon: Icon, note }) => (
              <Link className="overview-stat" to={to} key={label}>
                <Icon size={22} aria-hidden="true" />
                <span>{label}</span>
                <strong>{value.toLocaleString("en-PH")}</strong>
                <small>{note}</small>
              </Link>
            ))}
            <div className="overview-stat unavailable">
              <Users size={22} aria-hidden="true" />
              <span>Registered families</span>
              <strong>—</strong>
              <small>Database family registry pending</small>
            </div>
            <div className="overview-stat unavailable">
              <HeartHandshake size={22} aria-hidden="true" />
              <span>Active 4Ps households</span>
              <strong>—</strong>
              <small>Verified program data pending</small>
            </div>
          </section>
          <div className="overview-analytics">
            <Distribution
              title="Population by age group"
              values={data.age_groups}
            />
            <Distribution
              title="Residency classification"
              values={data.residency}
            />
            <Distribution title="Sex distribution" values={data.sex} />
            <Distribution
              title="Household-size distribution"
              values={data.household_sizes}
            />
            <Distribution
              title="Household water sources"
              values={data.water_sources}
            />
            <Distribution
              title="Household sanitation"
              values={data.sanitation}
            />
            <Distribution
              title="Missing and unverified data"
              values={data.data_quality}
            />
            <section className="overview-panel">
              <h2>Housing overview</h2>
              <dl className="overview-housing">
                <div>
                  <dt>Active units</dt>
                  <dd>{data.housing_units}</dd>
                </div>
                <div>
                  <dt>Units with current occupancy</dt>
                  <dd>{data.occupied_units}</dd>
                </div>
                <div>
                  <dt>Mapped units</dt>
                  <dd>{data.mapped_units ?? "Unavailable"}</dd>
                </div>
              </dl>
              <Link to="/gis">
                View housing map <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </section>
          </div>
        </>
      )}
      <div className="overview-analytics">
        <section className="overview-panel">
          <h2>Social protection</h2>
          <p className="muted">
            4Ps totals will appear when verified beneficiary records and
            permissions are available. No household is classified from missing
            data.
          </p>
          <Link to="/social-assistance">
            Open Social Assistance setup <ArrowRight size={15} />
          </Link>
        </section>
        <section className="overview-panel">
          <h2>Recent activity</h2>
          {activity.isPending && (
            <p className="muted" role="status">
              Loading activity…
            </p>
          )}
          {activity.isError && (
            <p className="muted">
              Activity is unavailable for this account or the audit feed could
              not be reached.
            </p>
          )}
          {activity.data && !activity.data.results.length && (
            <p className="muted">No database audit events are recorded yet.</p>
          )}
          {activity.data?.results.slice(0, 5).map((event) => (
            <div className="overview-activity-row" key={event.id}>
              <div>
                <strong>{event.action}</strong>
                <small>
                  {event.target_type} · {event.target_id}
                </small>
              </div>
              <span>
                {event.actor_username ?? "System"}
                <small>
                  {new Date(event.occurred_at).toLocaleString("en-PH", {
                    timeZone: "Asia/Manila",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </small>
              </span>
            </div>
          ))}
          {activity.data?.results.length ? (
            <Link to="/audit">
              View activity log <ArrowRight size={15} />
            </Link>
          ) : null}
        </section>
      </div>
      <section className="overview-panel overview-actions">
        <h2>Quick actions</h2>
        <div>
          <Link to="/residents">Register resident</Link>
          <Link to="/households">Add household</Link>
          <Link to="/families">Family registry setup</Link>
          <Link to="/housing">Add housing unit</Link>
          <Link to="/gis">
            <MapPinned size={16} aria-hidden="true" /> Housing map
          </Link>
          <Link to="/social-assistance">Social assistance setup</Link>
          <Link to="/forms">Barangay forms setup</Link>
          <Link to="/reports">Reports</Link>
        </div>
      </section>
    </div>
  );
}
