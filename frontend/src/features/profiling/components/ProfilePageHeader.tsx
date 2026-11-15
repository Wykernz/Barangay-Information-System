import { Link } from "react-router-dom";
import {
  ChevronRight,
  Pencil,
  Plus,
  UsersRound,
  House,
  Building2,
  ClipboardList,
} from "lucide-react";

export function ProfilePageHeader({
  module,
  title,
  singular,
  detail,
  disabled,
  edit,
}: {
  module: string;
  title: string;
  singular: string;
  detail: boolean;
  disabled: boolean;
  edit: () => void;
}) {
  const Icon =
    {
      residents: UsersRound,
      households: House,
      housing: Building2,
      surveys: ClipboardList,
    }[module] ?? UsersRound;
  return (
    <>
      <nav className="profile-breadcrumb" aria-label="Breadcrumb">
        <span>Profiling</span>
        <ChevronRight size={14} aria-hidden="true" />
        <Link to={`/${module}`}>
          {
            {
              residents: "Residents",
              households: "Households",
              housing: "Housing units",
              surveys: "Surveys",
            }[module]
          }
        </Link>
        {detail && (
          <>
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">Profile details</span>
          </>
        )}
      </nav>
      <div className="profile-page-header">
        <div className="profile-title-group">
          <span className="profile-module-icon">
            <Icon size={23} aria-hidden="true" />
          </span>
          <div>
            <h1>{title}</h1>
            <p>
              {detail
                ? "Review information and manage connected records."
                : `Find, review, and maintain ${singular} records.`}
            </p>
          </div>
        </div>
        <button onClick={edit} disabled={disabled}>
          {detail ? (
            <Pencil size={16} aria-hidden="true" />
          ) : (
            <Plus size={17} aria-hidden="true" />
          )}
          {detail ? "Edit details" : `Add ${singular}`}
        </button>
      </div>
    </>
  );
}
