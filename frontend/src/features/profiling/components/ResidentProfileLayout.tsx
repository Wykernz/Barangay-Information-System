import { useRef, type ChangeEvent, type ReactNode } from "react";
import {
  Camera,
  ClipboardList,
  MapPin,
  UserRound,
  UsersRound,
  Upload,
} from "lucide-react";
import type { RecordRow } from "../../../demo/catalog";
import { ageAt } from "../../../demo/catalog";
import "../personProfile.css";

const personal = [
  "firstName",
  "middleName",
  "surname",
  "suffix",
  "birthdate",
  "sex",
  "civilStatus",
];
const other = ["nationality", "placeOfBirth", "contactNumber", "email"];
const residency = ["residencyClassification", "residencyStatus", "purok"];
const grouped = new Set([...personal, ...other, ...residency, "recordStatus"]);

export function ResidentProfileLayout({
  draft,
  existing,
  fields,
  photoUrl,
  photoName,
  photoDisabled,
  onPhotoChange,
  ageSummary,
  notice,
  children,
}: {
  draft: RecordRow;
  existing: boolean;
  fields: Record<string, ReactNode>;
  photoUrl: string;
  photoName?: string;
  photoDisabled: boolean;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  ageSummary: ReactNode;
  notice?: string;
  children: ReactNode;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const extra = Object.keys(fields).filter((key) => !grouped.has(key));
  const registration = draft.registrationDate
    ? new Date(draft.registrationDate).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
      })
    : existing
      ? "Not recorded"
      : "Assigned when saved";
  return (
    <div className="person-form-layout">
      <div
        className="person-photo-panel"
        role="complementary"
        aria-label="Resident photograph"
      >
        <div className="person-photo-avatar">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile photo preview" />
          ) : (
            <UserRound aria-hidden="true" strokeWidth={1.2} />
          )}
          <span className="person-photo-camera">
            <Camera size={19} aria-hidden="true" />
          </span>
        </div>
        <input
          ref={upload}
          className="person-photo-input"
          tabIndex={-1}
          type="file"
          aria-label="Profile photo"
          accept="image/jpeg,image/png"
          disabled={photoDisabled}
          onChange={onPhotoChange}
        />
        <button
          type="button"
          className="secondary person-upload-button"
          disabled={photoDisabled}
          onClick={() => upload.current?.click()}
        >
          <Upload size={16} aria-hidden="true" />
          Upload Photo
        </button>
        <p>
          Optional JPEG or PNG
          <br />
          up to 5 MiB
        </p>
        {photoName && (
          <small className="person-photo-filename">{photoName}</small>
        )}
      </div>
      <div className="person-form-sections">
        <section
          className="person-card"
          aria-labelledby="person-personal-heading"
        >
          <h3 id="person-personal-heading">
            <UserRound size={20} aria-hidden="true" />
            Personal Information
          </h3>
          <div className="person-card-grid person-personal-grid">
            <label className="person-field person-field--personId">
              Person ID
              <input
                readOnly
                value={
                  draft.personId ||
                  (existing ? draft.id : "Assigned when saved")
                }
              />
            </label>
            {personal.slice(0, 5).map((key) => fields[key])}
            <label className="person-field person-field--age">
              Age
              <input
                readOnly
                value={draft.birthdate ? String(ageAt(draft.birthdate)) : "—"}
              />
            </label>
            {personal.slice(5).map((key) => fields[key])}
          </div>
          {ageSummary && (
            <div className="person-age-summary" role="status">
              {ageSummary}
            </div>
          )}
        </section>
        <section className="person-card" aria-labelledby="person-other-heading">
          <h3 id="person-other-heading">
            <MapPin size={20} aria-hidden="true" />
            Other Information
          </h3>
          <div className="person-card-grid person-other-grid">
            {other.map((key) => fields[key])}
          </div>
        </section>
        <section
          className="person-card"
          aria-labelledby="person-residency-heading"
        >
          <h3 id="person-residency-heading">
            <UsersRound size={20} aria-hidden="true" />
            Residency Information
          </h3>
          <div className="person-card-grid person-residency-grid">
            {residency.slice(0, 2).map((key) => fields[key])}
            <label className="person-field">
              Date of registration
              <input readOnly value={registration} />
            </label>
          </div>
        </section>
        <section
          className="person-card"
          aria-labelledby="person-status-heading"
        >
          <h3 id="person-status-heading">
            <ClipboardList size={20} aria-hidden="true" />
            Record Status
          </h3>
          <div className="person-card-grid person-residency-grid">
            {fields.recordStatus}
          </div>
        </section>
        <details className="person-optional-details">
          <summary>Additional information and household assignment</summary>
          <div className="person-optional-content">
            {fields.purok}
            {extra.map((key) => fields[key])}
            {children}
          </div>
        </details>
        {notice && <p className="person-storage-note">{notice}</p>}
      </div>
    </div>
  );
}
