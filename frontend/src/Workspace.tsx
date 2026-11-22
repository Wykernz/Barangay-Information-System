import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ChartNoAxesCombined,
  HeartPulse,
  House,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Settings2,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import {
  DatabaseHouseholdDetail,
  DatabaseHouseholdDirectory,
} from "./features/gis/HouseholdLocation";
import { DemoProvider, useDemo } from "./demo/store";
import { catalog } from "./demo/catalog";
import RecordPage from "./components/RecordPage";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import Reports from "./pages/Reports";
import HealthWorkspace from "./HealthWorkspace";
import BarangayLogo from "./components/BarangayLogo";
import "./styles/workspace.css";
import {
  ProfilingProvider,
  ProfilingPage,
} from "./features/profiling/Profiling";

function HouseholdProfileRoute({ module }: { module: string }) {
  const { id } = useParams();
  if (
    module === "households" &&
    id &&
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)
  ) {
    return <DatabaseHouseholdDetail />;
  }
  return (
    <>
      {module === "households" && !id ? (
        <DatabaseHouseholdDirectory />
      ) : (
        <ProfilingPage module={module} />
      )}
    </>
  );
}

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
  const links: [string, string, LucideIcon, string?][] = [
    ["/", "Overview", LayoutDashboard, "Workspace"],
    ["/health", "Health", HeartPulse],
    ["/residents", "Residents", Users, "Community records"],
    ["/households", "Households", UsersRound],
    ["/housing", "Housing units", House],
    ["/gis", "Housing map", MapPinned],
    ["/reports", "Reports", ChartNoAxesCombined, "Management"],
    ["/audit", "Activity log", Activity],
    ["/settings", "Settings", Settings2],
  ];
  return (
    <DemoProvider profilingFixtures persistResidents>
      <ProfilingProvider>
        <div className="workspace staff-shell">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <aside className={menu ? "menu-open" : ""}>
            <Link className="brand" to="/">
              <BarangayLogo size={56} />
              <span className="brand-copy">
                <strong>BIMS</strong>
                <span>Barangay Information System</span>
              </span>
            </Link>
            <button
              className="mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-controls="staff-navigation"
            >
              {menu ? (
                <X size={18} aria-hidden="true" />
              ) : (
                <Menu size={18} aria-hidden="true" />
              )}
              {menu ? "Close navigation" : "Open navigation"}
            </button>
            <nav id="staff-navigation" aria-label="Main navigation">
              {links.map(([to, label, Icon, group]) => (
                <div className="navigation-item" key={to}>
                  {group && <p className="navigation-label">{group}</p>}
                  <NavLink
                    key={to}
                    end={to === "/"}
                    to={to}
                    title={label}
                    onClick={() => setMenu(false)}
                  >
                    <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
                    <span>{label}</span>
                    <ArrowUpRight
                      className="navigation-arrow"
                      size={15}
                      aria-hidden="true"
                    />
                  </NavLink>
                </div>
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
              <div className="account-menu">
                <span className="avatar" aria-hidden="true">
                  {username.slice(0, 1).toUpperCase()}
                </span>
                <span className="account-name">
                  {username}
                  <small>Staff account</small>
                </span>
                <button className="secondary" onClick={logout}>
                  <LogOut size={16} aria-hidden="true" />
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
              <div className="demo-banner">
                <strong>
                  <span className="preview-dot" aria-hidden="true" />
                  Data source
                </strong>
                <span>
                  Overview totals come from the database. Some profiling views
                  still include labeled session samples; map locations are saved
                  separately.
                </span>
              </div>
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
                            <HouseholdProfileRoute
                              key={`${key}-list`}
                              module={key}
                            />
                          }
                        />
                        <Route
                          path=":id"
                          element={
                            <HouseholdProfileRoute
                              key={`${key}-detail`}
                              module={key}
                            />
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
                        "appointments",
                        "cases",
                        "services",
                        "users",
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
                <Route path="/health" element={<HealthWorkspace />} />
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
              BIMS · Staff workspace{" "}
              <details className="system-status">
                <summary>Sample records · System information</summary>
                <p>
                  Staff login and database household map locations are connected
                  to the server. Sample profiling records use browser memory and
                  reset on reload or sign-out.
                </p>
              </details>
            </footer>
          </div>
        </div>
      </ProfilingProvider>
    </DemoProvider>
  );
}
