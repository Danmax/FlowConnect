"use client";

import { useMemo, useState } from "react";
import type { FormResultsSnapshot, IntakeForm } from "@/lib/forms-repository";

export function FormResultsDashboard({ snapshot }: { snapshot: FormResultsSnapshot }) {
  const [sharePrivacy, setSharePrivacy] = useState<IntakeForm["sharePrivacy"]>(snapshot.form.sharePrivacy);
  const [piiSharingMode, setPiiSharingMode] = useState<IntakeForm["piiSharingMode"]>(snapshot.form.piiSharingMode);
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const maxDailyCount = Math.max(1, ...snapshot.submissionsByDay.map((item) => item.count));
  const piiFields = useMemo(() => snapshot.form.fields.filter((field) => field.hashPii), [snapshot.form.fields]);

  const generateSummary = async () => {
    setMessage("Creating AI summary...");
    const response = await fetch(`/api/forms/${snapshot.form.id}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharePrivacy, piiSharingMode })
    });
    const payload = (await response.json().catch(() => ({}))) as { summary?: string; error?: string };

    if (!response.ok || !payload.summary) {
      setMessage(payload.error ?? "AI summary could not be created.");
      return;
    }

    setSummary(payload.summary);
    setMessage("AI summary ready to share.");
  };

  return (
    <section className="workflow-builder">
      <div className="panel workflow-toolbar">
        <div>
          <span className="badge">Form results</span>
          <h1>{snapshot.form.name}</h1>
          <p className="lead">{snapshot.totalSubmissions.toLocaleString()} submissions collected from the public intake form.</p>
        </div>
        <a className="button" href="/forms">
          Back to forms
        </a>
      </div>

      <section className="results-grid">
        <article className="metric-card blue">
          <span>Total submissions</span>
          <strong>{snapshot.totalSubmissions.toLocaleString()}</strong>
        </article>
        <article className="metric-card emerald">
          <span>Tracked fields</span>
          <strong>{snapshot.form.fields.length}</strong>
        </article>
        <article className="metric-card rose">
          <span>PII hashed fields</span>
          <strong>{piiFields.length}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Submission trend</h2>
        <div className="bar-chart">
          {snapshot.submissionsByDay.length > 0 ? (
            snapshot.submissionsByDay.map((item, index) => (
              <div className="bar-row" key={item.label}>
                <span>{item.label}</span>
                <div>
                  <i style={{ width: `${Math.max(8, (item.count / maxDailyCount) * 100)}%` }} className={`chart-color-${index % 5}`} />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))
          ) : (
            <p className="muted">No submissions yet.</p>
          )}
        </div>
      </section>

      <section className="grid two">
        {snapshot.fieldBreakdowns.map((field, fieldIndex) => (
          <article className="card" key={field.fieldKey}>
            <h3>{field.label}</h3>
            <div className="mini-chart">
              {field.values.length > 0 ? (
                field.values.map((item, index) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <i className={`chart-color-${(fieldIndex + index) % 5}`} style={{ width: `${Math.max(10, item.count * 18)}px` }} />
                    <strong>{item.count}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">No chartable values yet.</p>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="panel connection-form">
        <div>
          <span className="badge">Privacy and AI summary</span>
          <h2>Share form results safely</h2>
          <p className="muted">PII-marked fields are already hashed at submission. Summary sharing can also hash or exclude those fields.</p>
        </div>
        <div className="grid two">
          <label>
            <span>Sharing privacy</span>
            <select value={sharePrivacy} onChange={(event) => setSharePrivacy(event.target.value as IntakeForm["sharePrivacy"])}>
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label>
            <span>PII in shared summary</span>
            <select value={piiSharingMode} onChange={(event) => setPiiSharingMode(event.target.value as IntakeForm["piiSharingMode"])}>
              <option value="hash">Hash PII</option>
              <option value="exclude">Exclude PII</option>
            </select>
          </label>
        </div>
        {piiFields.length > 0 ? (
          <p className="muted">PII fields: {piiFields.map((field) => field.label).join(", ")}</p>
        ) : (
          <p className="muted">No fields are marked as PII yet.</p>
        )}
        <button className="button primary big-button" onClick={generateSummary} type="button">
          Generate AI summary
        </button>
        {summary ? <textarea readOnly rows={8} value={summary} /> : null}
        {summary ? (
          <button className="button" onClick={() => navigator.clipboard?.writeText(summary)} type="button">
            Copy summary
          </button>
        ) : null}
        {message ? <p className={message.includes("could not") ? "form-error" : "form-success"}>{message}</p> : null}
      </section>

      <section className="panel">
        <h2>Recent submissions</h2>
        <div className="submission-table">
          {snapshot.submissions.slice(0, 20).map((submission) => (
            <article key={submission.id}>
              <strong>{new Date(submission.createdAt).toLocaleString()}</strong>
              <pre>{JSON.stringify(submission.payload, null, 2)}</pre>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
