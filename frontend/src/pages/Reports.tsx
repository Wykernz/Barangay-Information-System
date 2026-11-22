import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

type Overview = {
  as_of: string;
  registered_persons: number;
  verified_residents: number;
  active_households: number;
  housing_units: number;
  occupied_units: number;
  mapped_units: number | null;
};

export default function Reports() {
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["report-overview"],
    queryFn: async () => (await api.get<Overview>("overview/")).data,
    retry: false,
  });
  const data = query.data;
  const metrics: [string, number | string][] = data
    ? [
        ["Registered persons", data.registered_persons],
        ["Verified residents", data.verified_residents],
        ["Active households", data.active_households],
        ["Active housing units", data.housing_units],
        ["Occupied housing units", data.occupied_units],
        ["Mapped housing units", data.mapped_units ?? "Unavailable"],
      ]
    : [];
  function download() {
    if (!data) return;
    const csv = [
      "Metric,Count",
      ...metrics.map(
        ([label, value]) =>
          `"${label.replaceAll('"', '""')}","${String(value)}"`,
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "payahan-bims-operational-summary.csv";
    link.click();
    URL.revokeObjectURL(url);
    setNotice(
      "Database aggregate summary downloaded. No personal details were exported.",
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MANAGEMENT / REPORTING</p>
          <h1>Reports &amp; summaries</h1>
          <p className="muted">
            Review aggregate counts from authorized database records.
          </p>
          {data && (
            <p className="muted">
              Reporting date:{" "}
              {new Date(`${data.as_of}T00:00:00`).toLocaleDateString("en-PH", {
                dateStyle: "long",
              })}
            </p>
          )}
        </div>
        <div className="report-actions">
          <button
            className="secondary"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={download} disabled={!data}>
            <Download size={16} /> Download summary CSV
          </button>
        </div>
      </div>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {query.isPending && <p role="status">Loading database report…</p>}
      {query.isError && (
        <div className="panel" role="alert">
          <strong>Report unavailable</strong>
          <p>
            Database totals could not be loaded. Check registry permissions and
            connection, then retry.
          </p>
          <button onClick={() => query.refetch()}>Retry</button>
        </div>
      )}
      {data && (
        <section className="panel">
          <h2>Operational summary</h2>
          {metrics.map(([label, value]) => (
            <div className="quality-row" key={label}>
              <span>{label}</span>
              <strong>
                {typeof value === "number"
                  ? value.toLocaleString("en-PH")
                  : value}
              </strong>
            </div>
          ))}
          <p className="muted">
            Counts use the current overview endpoint. Family, 4Ps, purok, and
            detailed exports are not available until their source records and
            approved definitions are implemented.
          </p>
        </section>
      )}
    </>
  );
}
