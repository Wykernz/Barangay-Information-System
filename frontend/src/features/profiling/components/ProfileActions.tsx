import { Link } from "react-router-dom";
import { Eye, Pencil, Trash2, Undo2 } from "lucide-react";

/** Keep all row actions visible; record-specific names help screen-reader users. */
export function ProfileActions({
  to,
  name,
  archived,
  edit,
  remove,
  restore,
}: {
  to: string;
  name: string;
  archived: boolean;
  edit: () => void;
  remove: () => void;
  restore: () => void;
}) {
  return (
    <div className="profile-actions">
      <Link to={to} aria-label={`View ${name}`}>
        <Eye size={15} aria-hidden="true" />
        View
      </Link>
      <button type="button" onClick={edit} aria-label={`Edit ${name}`}>
        <Pencil size={15} aria-hidden="true" />
        Edit
      </button>
      {archived ? (
        <button type="button" onClick={restore} aria-label={`Restore ${name}`}>
          <Undo2 size={15} aria-hidden="true" />
          Restore
        </button>
      ) : (
        <button
          type="button"
          className="danger"
          onClick={remove}
          aria-label={`Delete ${name}`}
        >
          <Trash2 size={15} aria-hidden="true" />
          Delete
        </button>
      )}
    </div>
  );
}
