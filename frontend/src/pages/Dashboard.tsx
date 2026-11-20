import { Link } from "react-router-dom";
import { useDemo } from "../demo/store";
import {
  AGE_GROUPS,
  ageGroups,
  isSenior,
} from "../features/profiling/ageGroups";
import { Users, ClipboardCheck, UserPlus, ArrowUpRight } from "lucide-react";
import BarangayLogo from "../components/BarangayLogo";
import "./dashboard.css";

export default function Dashboard() {
  const { records, history } = useDemo();
  const active = records.residents.filter((row) => row.archived !== "true");
  const residents = active.filter(
    (row) => row.residencyClassification === "Resident",
  );
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
  const verified = records.residents.filter(
    (row) => row.status === "Verified",
  ).length;
  const categoryLinks: Record<string, string> = {
    Residents: "/residents?classification=Resident",
    "Non-residents": "/residents?classification=Non-resident",
    "Male residents": "/residents?category=male",
    "Female residents": "/residents?category=female",
    "LGBT residents (self-reported)": "/residents?category=lgbt",
    "Senior residents": "/residents?category=senior",
    "PWD residents (reported)": "/residents?category=pwd",
    "Active households": "/households?category=active-households",
  };
  return (
    <div className="profiling-overview">
      <div className="page-heading">
        <div className="overview-heading-brand">
          <BarangayLogo size={76} />
          <div>
            <p className="eyebrow">BARANGAY OPERATIONS</p>
            <h1>Workspace overview</h1>
            <p className="muted">Your community records, at a glance.</p>
          </div>
        </div>
        <Link className="button-link" to="/residents">
          <UserPlus size={16} aria-hidden="true" />
          Register resident
        </Link>
      </div>
      <div className="overview-columns">
        <section
          className="overview-summary"
          aria-labelledby="resident-summary"
        >
          <h2 id="resident-summary">Community at a glance</h2>
          <div className="stats-grid">
            {[
              ["Registered persons", active.length, "/residents"],
              ["Residents", residents.length, "/residents"],
              [
                "Non-residents",
                active.filter(
                  (row) => row.residencyClassification === "Non-resident",
                ).length,
                "/residents",
              ],
              [
                "Male residents",
                residents.filter((row) => row.sex === "Male").length,
                "/residents",
              ],
              [
                "Female residents",
                residents.filter((row) => row.sex === "Female").length,
                "/residents",
              ],
              [
                "LGBT residents (self-reported)",
                residents.filter((row) => row.lgbtIdentification === "Yes")
                  .length,
                "/residents",
              ],
              [
                "Senior residents",
                residents.filter((row) => isSenior(row.birthdate, today))
                  .length,
                "/residents",
              ],
              [
                "PWD residents (reported)",
                residents.filter((row) => row.pwdStatus === "Yes").length,
                "/residents",
              ],
              [
                "Active households",
                records.households.filter((row) => row.status === "Active")
                  .length,
                "/households",
              ],
              ["Housing units", records.housing.length, "/housing"],
            ].map(([label, count, to]) => (
              <Link
                className="stat-card"
                to={categoryLinks[String(label)] ?? String(to)}
                key={label}
              >
                <Users size={25} aria-hidden="true" />
                <span>{label}</span>
                <strong>{count}</strong>
                <small>View registry →</small>
              </Link>
            ))}
          </div>
        </section>
        <section className="overview-register">
          <div className="overview-identity">
            <BarangayLogo />
            <div>
              <h2>Barangay profiling</h2>
              <p>Resident & household management</p>
            </div>
          </div>
          <div className="overview-table-heading">
            <h2>Recently registered profiles</h2>
            <Link to="/residents">
              View registry <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Residency</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {active
                  .slice(-8)
                  .reverse()
                  .map((person) => (
                    <tr key={person.id}>
                      <td>
                        <Link to={`/residents/${person.id}`}>
                          {person.surname
                            ? `${person.surname}, ${person.firstName}`
                            : person.name}
                        </Link>
                      </td>
                      <td>
                        {person.residencyClassification ?? "Not classified"}
                      </td>
                      <td>
                        <span
                          className={`badge${person.status === "Verified" ? " positive" : ""}`}
                        >
                          {person.status ?? "Not recorded"}
                        </span>
                      </td>
                    </tr>
                  ))}
                {!active.length && (
                  <tr>
                    <td colSpan={3}>No registered profiles yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="overview-register-footer">
            <ClipboardCheck size={18} aria-hidden="true" />
            {verified} verified profiles · {active.length} active registered
            persons
          </div>
        </section>
      </div>
      <div className="dashboard-grid">
        <section
          className="panel overview-age-summary"
          aria-labelledby="age-summary-title"
        >
          <h2 id="age-summary-title">Resident age groups</h2>
          <p className="muted">
            Active residents only, calculated from birthdate. Groups are
            mutually exclusive. Ages 75+ await classification.
          </p>
          <dl className="overview-age-grid">
            {AGE_GROUPS.map(({ label }) => label).map((group) => (
              <div key={group}>
                <dt>
                  <Link to={`/residents?category=${encodeURIComponent(group)}`}>
                    {group}
                  </Link>
                </dt>
                <dd>
                  {
                    residents.filter((person) =>
                      ageGroups(person.birthdate, today).includes(group),
                    ).length
                  }
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="panel">
          <h2>Health records</h2>
          <p>
            Residents with health records: unavailable until the protected
            database summary is connected.
          </p>
          <p>
            LGBT identification is independent of sex. Blank or declined answers
            are not counted as No. Demographic groups overlap.
          </p>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Data quality</h2>
            <Link to="/residents">Review profiles →</Link>
          </div>
          <p>Resident verification</p>
          <div className="progress-track">
            <div
              style={{
                width: `${records.residents.length ? (verified / records.residents.length) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="muted">
            {verified} of {records.residents.length} profiles verified
          </p>
          <div className="quality-row">
            <span>Unmapped housing units</span>
            <strong>
              {
                records.housing.filter((row) => row.status === "Unmapped")
                  .length
              }
            </strong>
          </div>
        </section>
        <section className="panel">
          <h2>Quick access</h2>
          <div className="quick-links">
            <Link to="/households">Household directory →</Link>
            <Link to="/gis">Housing map →</Link>
            <Link to="/reports">Reports & summaries →</Link>
          </div>
        </section>
        <section className="panel">
          <h2>Recent activity</h2>
          {history.length ? (
            history.slice(0, 5).map((item) => (
              <div className="activity-row" key={item.id}>
                <div>
                  <strong>{item.description}</strong>
                  <p>
                    {new Date(item.time).toLocaleString("en-PH", {
                      timeZone: "Asia/Manila",
                    })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">
              No changes this session. Update a record to see its activity here.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
