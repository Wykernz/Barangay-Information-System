import { useState } from "react";
import { gisApi } from "./api";

export default function HouseNumberEditor({
  unitId,
  number,
  onSaved,
}: {
  unitId: string;
  number: string;
  onSaved: (number: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(number);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section aria-label="House numbering">
      <p>
        House number: <strong>{number || "Not numbered"}</strong>
      </p>
      {!editing ? (
        <button
          className="secondary"
          onClick={() => {
            setValue(number);
            setMessage("");
            setEditing(true);
          }}
        >
          Assign house number
        </button>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setMessage("");
            try {
              const saved = await gisApi.numberHouse(unitId, value.trim());
              onSaved(saved.house_number);
              setEditing(false);
              setMessage("House number saved.");
            } catch {
              setMessage(
                "House number was not saved. Check your permission and connection.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <label>
            House number
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={50}
              disabled={pending}
            />
          </label>
          <p>
            Enter the house’s assigned number, such as 12-A. Leave blank if
            unnumbered. This applies to every household sharing this house.
          </p>
          <button disabled={pending}>
            {pending ? "Saving…" : "Save house number"}
          </button>
          <button
            className="secondary"
            type="button"
            disabled={pending}
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
