import { ClipboardList, MapPin, UserRound, UsersRound } from "lucide-react";
import type { RecordRow } from "../../../demo/catalog";
import { ageAt } from "../../../demo/catalog";

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
