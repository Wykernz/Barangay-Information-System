import { useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { DemoProvider, useDemo } from "./demo/store";
import { catalog } from "./demo/catalog";
import RecordPage from "./components/RecordPage";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import Reports from "./pages/Reports";
import "./styles/workspace.css";

function Audit() {
  const { history } = useDemo();
  return (
    <>
      <p className="eyebrow">ACCOUNTABILITY</p>
      <h1>Demo activity</h1>
      <p className="muted">
        Session-only UI history. This is not the server audit log.
      </p>
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
            <p>Changes to demo records will appear here.</p>
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
        <h2>Demo session</h2>
        <p>
          Demo changes live in memory and reset on reload or sign-out. Do not
          enter real personal information.
        </p>
        {notice && <p role="status">{notice}</p>}
        {confirm ? (
          <div>
            <p>Discard all changes to synthetic demo records?</p>
            <button
              onClick={() => {
                reset();
                setConfirm(false);
                setNotice("Demo records restored.");
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
            Reset demo records
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
    ["/surveys", "Surveys"],
    ["/gis", "Housing map"],
    ["/appointments", "Appointments"],
    ["/cases", "Complaints & cases"],
    ["/reports", "Reports"],
    ["/services", "Office services"],
    ["/users", "Staff & access"],
    ["/audit", "Demo activity"],
    ["/settings", "Settings"],
  ];
  return (
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
              Module changes are session-only. Do not enter real resident
              information.
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
        </div>
      </div>
    </DemoProvider>
  );
}
