import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileDown,
  FileText,
  Printer,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import "./printable-forms.css";

type KpForm = {
  slug: string;
  number: string;
  title: string;
  file: string;
  pages?: number;
};

const asset = (name: string) => `/forms/kp/${name}`;

export const kpForms: KpForm[] = [
  {
    slug: "kp-01",
    number: "KP Form No. 1",
    title: "Notice to Constitute the Lupon",
    file: asset("kp-page-01.pdf"),
  },
  {
    slug: "kp-02",
    number: "KP Form No. 2",
    title: "Appointment",
    file: asset("kp-page-02.pdf"),
  },
  {
    slug: "kp-03",
    number: "KP Form No. 3",
    title: "Notice of Appointment",
    file: asset("kp-page-03.pdf"),
  },
  {
    slug: "kp-04",
    number: "KP Form No. 4",
    title: "List of Appointed Lupon Members",
    file: asset("kp-page-04.pdf"),
  },
  {
    slug: "kp-05",
    number: "KP Form No. 5",
    title: "Oath of Office",
    file: asset("kp-page-05.pdf"),
  },
  {
    slug: "kp-06",
    number: "KP Form No. 6",
    title: "Withdrawal of Appointment",
    file: asset("kp-page-06.pdf"),
  },
  {
    slug: "kp-07",
    number: "KP Form No. 7",
    title: "Complaint",
    file: asset("kp-page-07.pdf"),
  },
  {
    slug: "kp-08",
    number: "KP Form No. 8",
    title: "Notice of Hearing — Mediation Proceedings",
    file: asset("kp-page-08.pdf"),
  },
  {
    slug: "kp-09",
    number: "KP Form No. 9",
    title: "Summons and Officer’s Return",
    file: asset("kp-form-09.pdf"),
    pages: 2,
  },
  {
    slug: "kp-10",
    number: "KP Form No. 10",
    title: "Notice for Constitution of Pangkat",
    file: asset("kp-page-11.pdf"),
  },
  {
    slug: "kp-11",
    number: "KP Form No. 11",
    title: "Notice of Selection as Pangkat Member",
    file: asset("kp-page-12.pdf"),
  },
  {
    slug: "kp-12",
    number: "KP Form No. 12",
    title: "Notice of Hearing",
    file: asset("kp-page-13.pdf"),
  },
  {
    slug: "kp-13",
    number: "KP Form No. 13",
    title: "Subpoena",
    file: asset("kp-page-14.pdf"),
  },
  {
    slug: "kp-14",
    number: "KP Form No. 14",
    title: "Agreement for Arbitration",
    file: asset("kp-page-15.pdf"),
  },
  {
    slug: "kp-15",
    number: "KP Form No. 15",
    title: "Arbitration Award",
    file: asset("kp-page-16.pdf"),
  },
  {
    slug: "kp-16",
    number: "KP Form No. 16",
    title: "Amicable Settlement",
    file: asset("kp-page-17.pdf"),
  },
  {
    slug: "kp-17",
    number: "KP Form No. 17",
    title: "Repudiation",
    file: asset("kp-page-18.pdf"),
  },
  {
    slug: "kp-18",
    number: "KP Form No. 18",
    title: "Notice of Hearing",
    file: asset("kp-page-19.pdf"),
  },
  {
    slug: "kp-19",
    number: "KP Form No. 19",
    title: "Notice of Hearing — Failure to Appear",
    file: asset("kp-page-20.pdf"),
  },
  {
    slug: "kp-20",
    number: "KP Form No. 20",
    title: "Certification to File Action",
    file: asset("kp-page-21.pdf"),
  },
  {
    slug: "kp-20-a",
    number: "KP Form No. 20-A",
    title: "Certification to File Action",
    file: asset("kp-page-22.pdf"),
  },
  {
    slug: "kp-20-b",
    number: "KP Form No. 20-B",
    title: "Certification to File Action",
    file: asset("kp-page-23.pdf"),
  },
  {
    slug: "kp-21",
    number: "Revised KP Form No. 21",
    title: "Certification to Bar Action",
    file: asset("kp-page-24.pdf"),
  },
  {
    slug: "kp-22",
    number: "KP Form No. 22",
    title: "Certification to Bar Counterclaim",
    file: asset("kp-page-25.pdf"),
  },
  {
    slug: "kp-23",
    number: "KP Form No. 23",
    title: "Motion for Execution",
    file: asset("kp-page-26.pdf"),
  },
  {
    slug: "kp-24",
    number: "KP Form No. 24",
    title: "Notice of Hearing — Motion for Execution",
    file: asset("kp-page-27.pdf"),
  },
  {
    slug: "kp-25",
    number: "KP Form No. 25",
    title: "Notice of Execution",
    file: asset("kp-page-28.pdf"),
  },
];

export function PrintableFormDirectory() {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return kpForms.filter((form) =>
      `${form.number} ${form.title}`.toLowerCase().includes(needle),
    );
  }, [search]);

  return (
    <section className="printable-form-directory">
      <header className="housing-page-heading">
        <div>
          <p className="eyebrow">PROGRAMS &amp; SERVICES / FORMS</p>
          <h1>Katarungang Pambarangay forms</h1>
          <p>
            Forms reproduced from the supplied KP-FORM-NEW Word document. Open
            one form at a time to view, download, or print its original layout.
          </p>
        </div>
      </header>
      <section className="panel printable-form-catalog">
        <div className="printable-form-toolbar">
          <div>
            <h2>KP form packet</h2>
            <p>
              {kpForms.length} individual forms · original document wording and
              layout
            </p>
          </div>
          <label>
            Search forms
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Form number or title"
            />
          </label>
        </div>
        {!visible.length && (
          <p className="notice">No KP forms match that search.</p>
        )}
        <div className="printable-form-grid">
          {visible.map((form) => (
            <article key={form.slug}>
              <div className="printable-form-card-icon">
                <FileText size={20} />
              </div>
              <div>
                <span>{form.number}</span>
                <h3>{form.title}</h3>
                <p>
                  {form.pages ?? 1} printable{" "}
                  {form.pages === 2 ? "pages" : "page"}
                </p>
              </div>
              <Link className="button-link" to={`/forms/${form.slug}`}>
                Open form
              </Link>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export function PrintableFormDetail() {
  const { id = "" } = useParams();
  const form = kpForms.find((candidate) => candidate.slug === id);
  if (!form) {
    return (
      <section className="panel">
        <h1>KP form not found</h1>
        <Link to="/forms">Return to KP forms</Link>
      </section>
    );
  }
  return (
    <section className="kp-form-viewer">
      <div className="kp-form-heading">
        <div>
          <Link to="/forms">
            <ArrowLeft size={16} /> Back to KP forms
          </Link>
          <p className="eyebrow">{form.number}</p>
          <h1>{form.title}</h1>
          <p>Exact PDF export from KP-FORM-NEW.docx.</p>
        </div>
        <div className="kp-form-actions">
          <a className="secondary button-link" href={form.file} download>
            <FileDown size={16} /> Download PDF
          </a>
          <a
            className="button-link"
            href={form.file}
            target="_blank"
            rel="noreferrer"
          >
            <Printer size={16} /> Open PDF to print
          </a>
        </div>
      </div>
      <p className="kp-print-help">
        The PDF opens one selected KP form only. In the PDF viewer, choose the
        printer icon or press Ctrl+P. KP Form No. 9 includes both of its pages.
      </p>
      <object
        className="kp-pdf-preview"
        data={`${form.file}#view=FitH&toolbar=1&navpanes=0`}
        type="application/pdf"
        aria-label={`${form.number} ${form.title} preview`}
      >
        <p>
          PDF preview is unavailable in this browser.{" "}
          <a href={form.file}>Open the PDF</a>.
        </p>
      </object>
      <a
        className="kp-mobile-open button-link"
        href={form.file}
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLink size={16} /> Open form in PDF viewer
      </a>
    </section>
  );
}
