import { useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { DemoProvider, useDemo } from "./demo/store";
import { catalog } from "./demo/catalog";
import RecordPage from "./components/RecordPage";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import Reports from "./pages/Reports";
import FieldPlanner from "./planner/FieldPlanner";
import "./styles/workspace.css";
import {
  ProfilingProvider,
  ProfilingPage,
} from "./features/profiling/Profiling";

function Audit() {
  const { history } = useDemo();
  return (
    <>
      <p className="eyebrow">ACCOUNTABILITY</p>
      <h1>Activity log</h1>
      <p className="muted">Record changes made during the current session.</p>
      <section className="panel">
        {history.length ? (
          history.map((item) => (
            <div className="quality-row" key={item.id}>
              <span>{item.description}</span>
              <time>
                {new Date(item.time).toLocaleString("en-PH", {
                  timeZone: "Asia/Manila",
                })}
              </time>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <h2>No changes yet</h2>
            <p>Updates made during this session will appear here.</p>
          </div>
        )}
      </section>
    </>
  );
}
function Settings() {
  const { reset } = useDemo();
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <>
      <p className="eyebrow">WORKSPACE</p>
      <h1>Settings</h1>
      <section className="panel">
        <h2>Workspace data</h2>
        <p>
          Current sample-data changes reset on reload or sign-out. Do not enter
          real personal information.
        </p>
        {notice && <p role="status">{notice}</p>}
        {confirm ? (
          <div>
            <p>Discard all changes to presentation sample records?</p>
            <button
              onClick={() => {
                reset();
                setConfirm(false);
                setNotice("Presentation sample records restored.");
              }}
            >
              Confirm reset
            </button>
            <button className="secondary" onClick={() => setConfirm(false)}>
              Keep changes
            </button>
          </div>
        ) : (
          <button className="secondary" onClick={() => setConfirm(true)}>
            Restore sample records
          </button>
        )}
      </section>
      <section className="panel">
        <h2>Account security</h2>
        <p>
          Contact your system administrator for password changes and access
          assignments. Sensitive permissions will be enforced by each module’s
          server API.
        </p>
      </section>
    </>
  );
}
export default function Workspace({
  username,
  logout,
  logoutError,
}: {
  username: string;
  logout: () => void;
  logoutError: string;
}) {
  const [menu, setMenu] = useState(false);
  const links = [
    ["/", "Overview"],
    ["/residents", "Residents"],
    ["/households", "Households"],
    ["/housing", "Housing units"],
    ["/gis", "Housing map"],
    ["/data-capture", "Field planner"],
    ["/appointments", "Appointments"],
    ["/cases", "Complaints & cases"],
    ["/reports", "Reports"],
    ["/services", "Office services"],
    ["/users", "Staff & access"],
    ["/audit", "Activity log"],
    ["/settings", "Settings"],
  ];
  return (
 feature/adrian-setup
    <DemoProvider>
      <div className="workspace staff-shell">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <aside className={menu ? "menu-open" : ""}>
          <Link className="brand" to="/">
            BIMS<span>Barangay Information System</span>
          </Link>
          <button
            className="mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-controls="staff-navigation"
          >
            {menu ? "Close navigation" : "Open navigation"}
          </button>
          <nav id="staff-navigation" aria-label="Main navigation">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                end={to === "/"}
                to={to}
                onClick={() => setMenu(false)}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <p className="sidebar-note">
            LOCAL OFFICE WORKSPACE
            <br />
            Community. Records. Service.
          </p>
        </aside>
        <div className="main-column">
          <header>
            <span>Staff administration</span>
            <div>
              <span className="avatar" aria-hidden="true">
                {username.slice(0, 1).toUpperCase()}
              </span>
              {username}
              <button className="secondary" onClick={logout}>
                Sign out
              </button>
            </div>
          </header>
          <div className="demo-banner">
            <strong>Synthetic demo workspace</strong>
            <span>
              Record-module demo changes are session-only. Field planner drafts
              save to the backend. Do not enter real resident information.
            </span>
          </div>
          <main id="main-content" className="content" tabIndex={-1}>
            {logoutError && (
              <p role="alert" className="error">
                {logoutError}
              </p>
            )}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              {Object.keys(catalog).map((key) => (
=======
    <DemoProvider profilingFixtures>
      <ProfilingProvider>
        <div className="workspace staff-shell">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <aside className={menu ? "menu-open" : ""}>
            <Link className="brand" to="/">
              BIMS<span>Barangay Information System</span>
            </Link>
            <button
              className="mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-controls="staff-navigation"
            >
              {menu ? "Close navigation" : "Open navigation"}
            </button>
            <nav id="staff-navigation" aria-label="Main navigation">
              {links.map(([to, label]) => (
                <NavLink
                  key={to}
                  end={to === "/"}
                  to={to}
                  onClick={() => setMenu(false)}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <p className="sidebar-note">
              LOCAL OFFICE WORKSPACE
              <br />
              Community. Records. Service.
            </p>
          </aside>
          <div className="main-column">
            <header>
              <div className="office-heading">
                <strong>Barangay Information Management System</strong>
                <span>Administration office</span>
              </div>
              <div>
                <span className="avatar" aria-hidden="true">
                  {username.slice(0, 1).toUpperCase()}
                </span>
                {username}
                <button className="secondary" onClick={logout}>
                  Sign out
                </button>
              </div>
            </header>
            <main id="main-content" className="content" tabIndex={-1}>
              {logoutError && (
                <p role="alert" className="error">
                  {logoutError}
                </p>
              )}
              <Routes>
                {/* Surveys are deferred. Keep their fixtures/contracts, but expose no route. */}
                <Route path="/" element={<Dashboard />} />
                {["residents", "households", "housing"].map((key) => (
                  <Route
                    key={key}
                    path={`/${key}/*`}
                    element={
                      <Routes>
                        <Route
                          index
                          element={
                            <ProfilingPage key={`${key}-list`} module={key} />
                          }
                        />
                        <Route
                          path=":id"
                          element={
                            <ProfilingPage key={`${key}-detail`} module={key} />
                          }
                        />
                      </Routes>
                    }
                  />
                ))}
                {Object.keys(catalog)
                  .filter(
                    (key) =>
                      ![
                        "residents",
                        "households",
                        "housing",
                        "surveys",
                      ].includes(key),
                  )
                  .map((key) => (
                    <Route
                      key={key}
                      path={`/${key}`}
                      element={<RecordPage key={key} module={key} />}
                    />
                  ))}
                <Route path="/gis" element={<MapPage />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/audit" element={<Audit />} />
                <Route path="/settings" element={<Settings />} />
feature/adrian-setup
                <Route
                  path="*"
                  element={
                    <section className="empty-state">
                      <h1>Page not found</h1>
                      <Link to="/">Return to overview</Link>
                    </section>
                  }
                />
 feature/adrian-setup
              ))}
              <Route path="/gis" element={<MapPage />} />
              <Route path="/data-capture" element={<FieldPlanner />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="*"
                element={
                  <section className="empty-state">
                    <h1>Page not found</h1>
                    <Link to="/">Return to overview</Link>
                  </section>
                }
              />
            </Routes>
          </main>
          <footer className="workspace-footer">
            BIMS · Staff workspace <span>Asia/Manila · Frontend demo</span>
          </footer>
=======
              </Routes>
            </main>
            <footer className="workspace-footer">
              BIMS · Staff workspace{" "}
              <details className="system-status">
                <summary>Sample records · System information</summary>
                <p>
                  Staff login is connected to the server. Operational module
                  records currently use sample data in browser memory; edits are
                  not stored in PostgreSQL and reset on reload or sign-out.
                </p>
              </details>
            </footer>
          </div>
 feature/adrian-setup
        </div>
      </ProfilingProvider>
    </DemoProvider>
  );
}
