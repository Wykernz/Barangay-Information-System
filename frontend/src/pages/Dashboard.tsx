import { Link } from "react-router-dom";
import { useDemo } from "../demo/store";

export default function Dashboard() {
  const { records, history } = useDemo();
  const verified = records.residents.filter(
    (row) => row.status === "Verified",
  ).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BARANGAY OPERATIONS</p>
          <h1>Workspace overview</h1>
          <p className="muted">
            A clear view of your community and the work ahead.
          </p>
        </div>
        <Link className="button-link" to="/residents">
          Register resident
        </Link>
      </div>
      <div className="stats-grid">
        {[
          ["Residents", records.residents.length, "/residents"],
          [
            "Active households",
            records.households.filter((row) => row.status === "Active").length,
            "/households",
          ],
          ["Housing units", records.housing.length, "/housing"],
          [
            "Pending visits",
            records.appointments.filter((row) => row.status === "Pending")
              .length,
            "/appointments",
          ],
        ].map(([label, count, to]) => (
          <Link className="stat-card" to={String(to)} key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
            <small>View registry →</small>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
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
          <div className="section-heading">
            <h2>Appointment requests</h2>
            <Link to="/appointments">View all →</Link>
          </div>
          {records.appointments.slice(0, 4).map((row) => (
            <div className="activity-row" key={row.id}>
              <span className="date-tile">{row.time}</span>
              <div>
                <strong>{row.name}</strong>
                <p>
                  {row.service} · {row.date}
                </p>
              </div>
              <span className="badge">{row.status}</span>
            </div>
          ))}
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
    </>
  );
}
