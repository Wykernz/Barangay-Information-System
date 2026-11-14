import { useState } from "react";
import { useDemo } from "../demo/store";

export default function Reports() {
  const { records } = useDemo();
  const [notice, setNotice] = useState("");
  const metrics: [string, number][] = [
    ["Residents", records.residents.length],
    [
      "Active households",
      records.households.filter((row) => row.status === "Active").length,
    ],
    ["Housing units", records.housing.length],
    [
      "Unverified residents",
      records.residents.filter((row) => row.status === "Unverified").length,
    ],
    [
      "Pending appointments",
      records.appointments.filter((row) => row.status === "Pending").length,
    ],
  ];
  function download() {
    // Only fixed aggregate names and numeric demo counts leave the browser.
    const blob = new Blob(
      [
        "SYNTHETIC DEMO ONLY\nMetric,Count\n" +
          metrics.map((row) => row.join(",")).join("\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bims-demo-summary.csv";
    link.click();
    URL.revokeObjectURL(url);
    setNotice(
      "Synthetic summary downloaded. No resident details were exported.",
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">REPORTING</p>
          <h1>Reports & summaries</h1>
          <p className="muted">
            Review consistent counts from the current demo workspace.
          </p>
        </div>
        <button onClick={download}>Download demo CSV</button>
      </div>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <section className="panel">
        <h2>Operational summary</h2>
        {metrics.map(([label, value]) => (
          <div className="quality-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <p className="muted">
          Real exports will require approved report definitions, server
          authorization, and access logging.
        </p>
      </section>
    </>
  );
}
