import { useEffect, useState } from "react";
import {
  ClipboardList,
  HeartPulse,
  History,
  House,
  MapPin,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../../api";
import type { RecordRow } from "../../../demo/catalog";
import { ageAt } from "../../../demo/catalog";

type Membership = {
  id: string;
  household: string;
  relationship: string;
  is_head: boolean;
  valid_from: string;
  valid_to: string | null;
};
type MembershipPage = { results: Membership[] };
type AuditEvent = {
  id: string;
  occurred_at: string;
  actor_username: string | null;
  action: string;
  target_type: string;
  target_id: string;
};
type AuditPage = { results: AuditEvent[] };

const groups = [
  {
    title: "Personal Information",
    icon: UserRound,
    items: [
      ["Person ID", "personId"],
      ["First name", "firstName"],
      ["Middle name", "middleName"],
      ["Last name", "surname"],
      ["Suffix", "suffix"],
      ["Date of birth", "birthdate"],
      ["Age", "age"],
      ["Sex", "sex"],
      ["Civil status", "civilStatus"],
    ],
  },
  {
    title: "Other Information",
    icon: MapPin,
    items: [
      ["Nationality", "nationality"],
      ["Place of birth", "placeOfBirth"],
      ["Contact number", "contactNumber"],
      ["Email address", "email"],
    ],
  },
  {
    title: "Residency Information",
    icon: UsersRound,
    items: [
      ["Residency classification", "residencyClassification"],
      ["Residency status", "residencyStatus"],
      ["Date of registration", "registrationDate"],
      ["Purok", "purok"],
    ],
  },
  {
    title: "Record Status",
    icon: ClipboardList,
    items: [
      ["Record status", "recordStatus"],
      ["Verification", "status"],
    ],
  },
] as const;

export function ResidentProfileDetails({
  resident,
  relationship,
}: {
  resident: RecordRow;
  relationship: string;
}) {
  const databaseRecord = resident._storage === "database";
  const [section, setSection] = useState("personal");
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [membershipError, setMembershipError] = useState(false);
  const [history, setHistory] = useState<AuditEvent[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  useEffect(() => {
    if (!databaseRecord) return;
    let active = true;
    api
      .get<MembershipPage>("household-memberships/", {
        params: { resident: resident.id },
      })
      .then(({ data }) => {
        if (active) setMemberships(data.results);
      })
      .catch(() => {
        if (active) setMembershipError(true);
      });
    api
      .get<AuditPage>("audit/events/", {
        params: { search: resident.id, page: 1 },
      })
      .then(({ data }) => {
        if (active)
          setHistory(
            data.results.filter((event) => event.target_id === resident.id),
          );
      })
      .catch(() => {
        if (active) setHistoryError(true);
      });
    return () => {
      active = false;
    };
  }, [databaseRecord, resident.id]);
  function value(key: string) {
    if (key === "age")
      return resident.birthdate
        ? `${ageAt(resident.birthdate)} (calculated)`
        : "Not recorded";
    if (key === "personId") return resident.personId || resident.id;
    if (key === "registrationDate")
      return resident.registrationDate
        ? new Date(resident.registrationDate).toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
          })
        : "Not recorded";
    return resident[key] || "Not recorded";
  }
  if (databaseRecord) {
    const sections = [
      ["personal", "Personal Information", UserRound],
      ["residency", "Residency Information", UsersRound],
      ["household", "Household Membership", House],
      ["family", "Family Relationships", UsersRound],
      ["health", "Health Information", HeartPulse],
      ["history", "Record History", History],
    ] as const;
    const shownGroups =
      section === "personal"
        ? groups.slice(0, 2)
        : section === "residency"
          ? groups.slice(2)
          : [];
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
    });
    return (
      <div className="resident-detail-with-tabs">
        <aside className="resident-view-photo" aria-label="Resident identity">
          <div className="resident-view-avatar">
            {resident.photoUrl ? (
              <img src={resident.photoUrl} alt="Resident profile" />
            ) : (
              <UserRound size={100} strokeWidth={1.2} aria-hidden="true" />
            )}
          </div>
          <h2>{resident.name}</h2>
          <p>Database record</p>
          <span className="resident-view-chip">{relationship}</span>
        </aside>
        <div className="resident-detail-tab-content">
          <nav
            className="resident-detail-tabs"
            aria-label="Resident profile sections"
          >
            {sections.map(([key, label, Icon]) => (
              <button
                type="button"
                key={key}
                aria-pressed={section === key}
                className={section === key ? "is-selected" : ""}
                onClick={() => setSection(key)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
          {shownGroups.map(({ title, icon: Icon, items }) => (
            <section
              className="resident-view-card"
              key={title}
              aria-label={title}
            >
              <h2>
                <Icon size={20} aria-hidden="true" />
                {title}
              </h2>
              <dl>
                {items.map(([label, key]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{value(key)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {section === "household" && (
            <section className="resident-view-card">
              <h2>
                <House size={20} /> Household membership
              </h2>
              {membershipError ? (
                <p role="alert">
                  Membership records are unavailable for this account.
                </p>
              ) : memberships === null ? (
                <p role="status">Loading household memberships…</p>
              ) : memberships.length ? (
                <div className="resident-membership-list">
                  {memberships.map((item) => {
                    const current =
                      item.valid_from <= today &&
                      (!item.valid_to || item.valid_to >= today);
                    return (
                      <article key={item.id}>
                        <strong>
                          {item.is_head
                            ? "Head of household"
                            : item.relationship || "Member"}
                        </strong>
                        <span>
                          {current ? "Current" : "Historical"} ·{" "}
                          {item.valid_from}
                          {item.valid_to ? ` to ${item.valid_to}` : ""}
                        </span>
                        <Link to={`/households/${item.household}`}>
                          Open household
                        </Link>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p>No household memberships are recorded.</p>
              )}
            </section>
          )}
          {section === "family" && (
            <section className="resident-view-card">
              <h2>
                <UsersRound size={20} /> Family relationships
              </h2>
              <p>
                Family relationship records are not available yet. The system
                does not infer family membership from surname or marital status.
              </p>
            </section>
          )}
          {section === "health" && (
            <section className="resident-view-card">
              <h2>
                <HeartPulse size={20} /> Health information
              </h2>
              <p>
                Health details require separate health-workspace authorization.
              </p>
              <Link to="/health">Open Health workspace</Link>
            </section>
          )}
          {section === "history" && (
            <section className="resident-view-card">
              <h2>
                <History size={20} /> Record history
              </h2>
              {historyError ? (
                <p role="status">
                  Audit history is unavailable for this account.
                </p>
              ) : history === null ? (
                <p role="status">Loading record history…</p>
              ) : history.length ? (
                <div className="resident-membership-list">
                  {history.map((event) => (
                    <article key={event.id}>
                      <strong>{event.action}</strong>
                      <span>
                        {event.actor_username ?? "System"} ·{" "}
                        {new Date(event.occurred_at).toLocaleString("en-PH", {
                          timeZone: "Asia/Manila",
                        })}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No visible audit events are recorded for this profile.</p>
              )}
            </section>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="resident-view-layout">
      <aside className="resident-view-photo" aria-label="Resident identity">
        <div className="resident-view-avatar">
          {resident.photoUrl ? (
            <img src={resident.photoUrl} alt="Resident profile" />
          ) : (
            <UserRound size={100} strokeWidth={1.2} aria-hidden="true" />
          )}
        </div>
        <h2>{resident.name}</h2>
        <p>
          {resident._storage === "database"
            ? "Database record"
            : "Local sample · session only"}
        </p>
        <span className="resident-view-chip">{relationship}</span>
      </aside>
      <div className="resident-view-sections">
        {groups.map(({ title, icon: Icon, items }) => (
          <section
            className="resident-view-card"
            key={title}
            aria-label={title}
          >
            <h2>
              <Icon size={20} aria-hidden="true" />
              {title}
            </h2>
            <dl>
              {items.map(([label, key]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{value(key)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
