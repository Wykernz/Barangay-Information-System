import { useState, type FormEvent } from "react";
import { ageAt, catalog, type RecordRow } from "../demo/catalog";
import { useDemo } from "../demo/store";

/** Shared searchable list and editor keep draft forms consistent across modules. */
export default function RecordPage({ module }: { module: string }) {
  const definition = catalog[module];
  const { records, save } = useDemo();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [draft, setDraft] = useState<RecordRow | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const rows = records[module].filter(
    (row) =>
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "All" || row.status === status),
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (module === "residents" && new Date(draft.birthdate) > new Date()) {
      setError("Birthdate cannot be in the future.");
      return;
    }
    if (
      module === "services" &&
      (Number(draft.capacity) < 1 || draft.opens >= draft.closes)
    ) {
      setError("Use a positive capacity and a closing time after opening.");
      return;
    }
    if (
      module === "appointments" &&
      records.appointments.some(
        (row) =>
          row.id !== draft.id &&
          row.date === draft.date &&
          row.time === draft.time &&
          row.service === draft.service &&
          !["Cancelled", "Rejected"].includes(row.status),
      )
    ) {
      setError(
        "This service already has an appointment at that time. Choose another time.",
      );
      return;
    }
    save(module, draft);
    setDraft(null);
    setNotice("Record updated in this session. No server data was changed.");
  }
  function edit(row?: RecordRow) {
    setError("");
    setDraft(
      row
        ? { ...row }
        : (Object.fromEntries([
            ["id", `DEMO-${crypto.randomUUID().slice(0, 8)}`],
            ...definition.fields.map((field) => [
              field.key,
              field.options?.[0] ?? "",
            ]),
          ]) as RecordRow),
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">OFFICE RECORDS</p>
          <h1>{definition.title}</h1>
          <p className="muted">{definition.description}</p>
        </div>
        <button onClick={() => edit()}>+ Add {definition.singular}</button>
      </div>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <section className="panel">
        <div className="toolbar">
          <label>
            Search records
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, reference, or details"
            />
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option>All</option>
              {definition.fields
                .find((field) => field.key === "status")
                ?.options?.map((option) => (
                  <option key={option}>{option}</option>
                ))}
            </select>
          </label>
          <span className="muted">{rows.length} records</span>
        </div>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              {definition.title} — illustrative records
            </caption>
            <thead>
              <tr>
                <th>Reference</th>
                {definition.fields.map((field) => (
                  <th key={field.key}>{field.label}</th>
                ))}
                {module === "residents" && <th>Age</th>}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="reference">{row.id}</td>
                  {definition.fields.map((field) => (
                    <td key={field.key}>
                      {field.key === "status" ? (
                        <span
                          className={`badge ${["Verified", "Active", "Approved", "Completed"].includes(row[field.key]) ? "positive" : ""}`}
                        >
                          {row[field.key]}
                        </span>
                      ) : (
                        row[field.key]
                      )}
                    </td>
                  ))}
                  {module === "residents" && <td>{ageAt(row.birthdate)}</td>}
                  <td>
                    <button
                      className="text-button"
                      onClick={() => edit(row)}
                      aria-label={`Edit ${row.name}`}
                    >
                      View / edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty-state">
            <h2>No matching records</h2>
            <p>Try another search or add a record.</p>
            <button
              className="secondary"
              onClick={() => {
                setSearch("");
                setStatus("All");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
        <footer className="table-footer">
          Showing {rows.length} of {records[module].length} records · Current
          records currently loaded
        </footer>
      </section>
      {draft && (
        <section className="panel editor" aria-labelledby="editor-title">
          <h2 id="editor-title">Edit {definition.singular}</h2>
          <p>
            Use illustrative information only. Changes reset when you reload or
            sign out.
          </p>
          <form onSubmit={submit}>
            <div className="form-grid">
              {definition.fields.map((field) => (
                <label key={field.key}>
                  {field.label}
                  {field.options ? (
                    <select
                      value={draft[field.key]}
                      onChange={(event) =>
                        setDraft({ ...draft, [field.key]: event.target.value })
                      }
                    >
                      {field.options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type ?? "text"}
                      required={field.required}
                      maxLength={150}
                      min={field.type === "number" ? 1 : undefined}
                      value={draft[field.key]}
                      onChange={(event) =>
                        setDraft({ ...draft, [field.key]: event.target.value })
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            {module === "residents" &&
              records.residents.some(
                (row) =>
                  row.id !== draft.id &&
                  row.name.toLowerCase() === draft.name.toLowerCase(),
              ) && (
                <p className="notice">
                  Potential duplicate name. Review the existing record; no
                  automatic merge is performed.
                </p>
              )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="button-row">
              <button>Save record</button>
              <button
                type="button"
                className="secondary"
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
