import { ClipboardList, HeartHandshake, UsersRound } from "lucide-react";

type ReadinessKey = "families" | "social-assistance" | "forms";
const content: Record<
  ReadinessKey,
  { title: string; eyebrow: string; description: string; missing: string[] }
> = {
  families: {
    title: "Family registry",
    eyebrow: "COMMUNITY RECORDS / FAMILIES",
    description:
      "Family records are kept separate from households and person profiles.",
    missing: [
      "No Family or FamilyMembership database models or API are available.",
      "Family classification and duplicate-membership rules need barangay approval.",
    ],
  },
  "social-assistance": {
    title: "Social assistance",
    eyebrow: "PROGRAMS & SERVICES / 4Ps",
    description:
      "A verified household-linked program registry is required before beneficiary counts or details can be displayed.",
    missing: [
      "No official beneficiary source or verification workflow is connected.",
      "Pending or unknown households are not counted as beneficiaries.",
    ],
  },
  forms: {
    title: "Barangay forms",
    eyebrow: "PROGRAMS & SERVICES / FORMS",
    description:
      "Certificate templates must use approved document wording and verified resident information.",
    missing: [
      "The existing profile-form definitions are not printable certificate templates.",
      "Approved templates, issuance history, and authorization rules are not connected.",
    ],
  },
};

export default function ModuleReadiness({ module }: { module: ReadinessKey }) {
  const item = content[module];
  const Icon =
    module === "families"
      ? UsersRound
      : module === "forms"
        ? ClipboardList
        : HeartHandshake;
  return (
    <section className="readiness-page">
      <header className="housing-page-heading">
        <div>
          <p className="eyebrow">{item.eyebrow}</p>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
        </div>
        <span className="readiness-badge">Setup required</span>
      </header>
      <section className="panel readiness-card">
        <div className="readiness-icon">
          <Icon size={23} />
        </div>
        <div>
          <h2>This module is not connected to authoritative records yet</h2>
          <p>
            No production counts or synthetic operational records are shown
            here.
          </p>
          <ul>
            {item.missing.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>
    </section>
  );
}
