import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  getProfileForm,
  listProfileForms,
  profileFormError,
  type FormDefinition,
  type FormField,
} from "../../planner/api";
import "./printable-forms.css";

const moduleLabels: Record<FormDefinition["module"], string> = {
  residents: "Resident profiling",
  households: "Household profiling",
  housing: "Housing-unit profiling",
  surveys: "Survey",
  gis: "GIS field collection",
};

async function loadAllForms() {
  const forms: FormDefinition[] = [];
  let next: string | null = "profile-forms/";
  while (next) {
    const page = await listProfileForms(next);
    forms.push(...page.results);
    next = page.next;
  }
  return forms;
}

export function PrintableFormDirectory() {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [module, setModule] = useState("all");

  useEffect(() => {
    let active = true;
    loadAllForms()
      .then((rows) => {
        if (active) setForms(rows);
      })
      .catch((failure) => {
        if (active) setError(profileFormError(failure, "load"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(
    () => forms.filter((form) => module === "all" || form.module === module),
    [forms, module],
  );

  return (
    <section className="printable-form-directory">
      <header className="housing-page-heading">
        <div>
          <p className="eyebrow">PROGRAMS &amp; SERVICES / FORMS</p>
          <h1>Printable forms</h1>
          <p>
            Open and print one field-definition form at a time. These are blank
            data-collection sheets, not issued certificates or clearances.
          </p>
        </div>
      </header>

      <section className="panel printable-form-catalog">
        <div className="printable-form-toolbar">
          <div>
            <h2>Available form definitions</h2>
            <p>
              Draft and archived versions are labeled on their print preview.
            </p>
          </div>
          <label>
            Module
            <select
              value={module}
              onChange={(event) => setModule(event.target.value)}
            >
              <option value="all">All modules</option>
              {Object.entries(moduleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading && <p role="status">Loading printable forms…</p>}
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && !visible.length && (
          <div className="printable-form-empty">
            <FileText size={26} />
            <strong>No form definitions are available.</strong>
            <span>
              Create an approved field definition before printing a blank form.
            </span>
          </div>
        )}
        <div className="printable-form-grid">
          {visible.map((form) => (
            <article key={form.id}>
              <div className="printable-form-card-icon">
                <FileText size={20} />
              </div>
              <div>
                <span>{moduleLabels[form.module]}</span>
                <h3>{form.name}</h3>
                <p>
                  Version {form.version} · {form.fields.length} fields
                </p>
              </div>
              <span className={`form-status is-${form.status}`}>
                {form.status}
              </span>
              <Link className="button-link" to={`/forms/${form.id}`}>
                Open printable form
              </Link>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function BlankField({ field }: { field: FormField }) {
  const choices = field.options ?? [];
  if (["choice", "multi_choice", "boolean"].includes(field.data_type)) {
    const options = field.data_type === "boolean" ? ["Yes", "No"] : choices;
    return (
      <div className="print-choice-list">
        {options.map((option) => (
          <span key={option}>
            <i aria-hidden="true" /> {option}
          </span>
        ))}
        {!options.length && <span className="print-write-line" />}
      </div>
    );
  }
  if (field.data_type === "long_text") {
    return (
      <div className="print-long-lines" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    );
  }
  return <span className="print-write-line" aria-hidden="true" />;
}

export function PrintableFormDetail() {
  const { id = "" } = useParams();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getProfileForm(id)
      .then((value) => {
        if (active) setForm(value);
      })
      .catch((failure) => {
        if (active) setError(profileFormError(failure, "load"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const fields = useMemo(
    () =>
      [...(form?.fields ?? [])].sort(
        (left, right) => left.position - right.position,
      ),
    [form],
  );

  return (
    <section className="printable-form-preview">
      <div className="print-preview-actions no-print">
        <Link to="/forms">
          <ArrowLeft size={16} /> Back to printable forms
        </Link>
        <button type="button" disabled={!form} onClick={() => window.print()}>
          <Printer size={16} /> Print this form
        </button>
      </div>
      {loading && <p role="status">Loading printable form…</p>}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {form && (
        <article
          className="print-sheet"
          aria-label={`${form.name} printable form`}
        >
          {form.status !== "active" && (
            <div className="print-watermark">{form.status}</div>
          )}
          <header className="print-sheet-header">
            <p>Barangay Information Management System</p>
            <h1>{form.name}</h1>
            <span>
              {moduleLabels[form.module]} · Version {form.version}
            </span>
          </header>
          <section className="print-form-metadata">
            <label>
              Record/reference number <span />
            </label>
            <label>
              Date accomplished <span />
            </label>
            <label>
              Recorded by <span />
            </label>
          </section>
          <section className="print-field-list">
            {fields.map((field, index) => (
              <div
                className={`print-field is-${field.data_type}`}
                key={field.id ?? field.key}
              >
                <div className="print-field-label">
                  <b>
                    {index + 1}. {field.label}
                  </b>
                  {field.required && <em>Required</em>}
                  {field.sensitive && (
                    <em>Sensitive — authorized handling only</em>
                  )}
                  {field.help_text && <small>{field.help_text}</small>}
                </div>
                <BlankField field={field} />
              </div>
            ))}
          </section>
          {!fields.length && (
            <p className="print-no-fields">This definition has no fields.</p>
          )}
          <footer className="print-sheet-footer">
            Blank field-definition sheet · Not an issued certificate, clearance,
            or official boundary record
          </footer>
        </article>
      )}
    </section>
  );
}
